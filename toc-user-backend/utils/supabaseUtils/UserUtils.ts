/**
 * User Supabase Utilities
 * 
 * Database operations for user management using Supabase.
 * Handles CRUD operations across User, UserProfile, and PasswordResetTokens tables.
 * 
 * Tables:
 * - User: Core authentication data (email, password, username)
 * - UserProfile: Extended user info (names, organization, avatar)
 * - PasswordResetTokens: Temporary tokens for password reset flow
 * 
 * All functions use service role key for administrative database access.
 */

import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../../dto/UserProfile';
import { CompleteUser } from '../../dto/CompleteUser';
import { User } from '../../dto/User';
import { PasswordResetToken } from '../../dto/PasswordResetToken';
import UserResponse from '../../entities/user/UserResponse';

// ============================================================================
// Supabase Client
// ============================================================================

/**
 * Supabase client with service role key
 * Provides full database access for backend operations
 */
const supabase = createClient(
    process.env.TOC_SUPABASE_URL!,
    process.env.TOC_SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Constants
// ============================================================================

/**
 * PostgreSQL error code for "no rows found"
 * Used to distinguish between "not found" vs actual errors
 */
const POSTGRES_NOT_FOUND_CODE = 'PGRST116';

// ============================================================================
// User Retrieval Functions
// ============================================================================

/**
 * Finds a user by email address with their profile
 * 
 * Joins User table with UserProfile table to get complete user data.
 * Returns null if user not found (not an error).
 * 
 * @param email - User's email address (case-sensitive in DB)
 * @returns Complete user with profile, or null if not found
 * @throws Error if database operation fails
 */
export async function findUserByEmail(email: string): Promise<CompleteUser | null> {
    try {
        // Query User table and join with UserProfile
        const { data, error } = await supabase
            .from('User')
            .select(`
                *,
                profile:UserProfile(*)
            `)
            .eq('email', email)
            .single(); // Expect exactly one result

        // Handle "not found" gracefully
        if (error) {
            if (error.code === POSTGRES_NOT_FOUND_CODE) {
                return null; // User doesn't exist - not an error
            }
            throw error; // Actual database error
        }

        // Return user with profile (or null if no profile exists)
        return {
            ...data,
            profile: data.profile || null
        };
    } catch (error: unknown) {
        console.error('Error finding user by email:', error);
        throw new Error('Failed to find user');
    }
}

/**
 * Finds a user by their unique ID with their profile
 * 
 * Similar to findUserByEmail but uses user_id for lookup.
 * Useful for authenticated operations where we already have the user ID.
 * 
 * @param userId - User's unique identifier
 * @returns Complete user with profile, or null if not found
 * @throws Error if database operation fails
 */
export async function findUserById(userId: number): Promise<CompleteUser | null> {
    try {
        // Query User table and join with UserProfile
        const { data, error } = await supabase
            .from('User')
            .select(`
                *,
                profile:UserProfile(*)
            `)
            .eq('user_id', userId)
            .single(); // Expect exactly one result

        // Handle "not found" gracefully
        if (error) {
            if (error.code === POSTGRES_NOT_FOUND_CODE) {
                return null; // User doesn't exist
            }
            throw error; // Database error
        }

        // Return user with profile
        return {
            ...data,
            profile: data.profile || null
        };
    } catch (error: unknown) {
        console.error('Error finding user by ID:', error);
        throw new Error('Failed to find user');
    }
}

/**
 * Gets formatted user profile for API responses
 * 
 * Fetches user data and formats it for client display.
 * Creates a displayName by combining first/last name, or falls back to username/email.
 * 
 * @param email - User's email address
 * @returns Formatted user response, or null if user not found
 * @throws Error if database operation fails
 */
export async function getUserProfile(email: string): Promise<UserResponse | null> {
    try {
        // Get complete user data
        const user = await findUserByEmail(email);

        if (!user) {
            return null;
        }

        const profile = user.profile;

        // Build display name: "First Last" > username > email
        const displayName = profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : user.username || user.email;

        // Return formatted response
        return {
            userId: user.user_id,
            email: user.email,
            username: user.username,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            organisation: profile?.organisation,
            avatarUrl: profile?.avatar_url,
            displayName: displayName || user.email,
            createdAt: user.created_at,
            userRole: user.user_role
        };
    } catch (error: unknown) {
        console.error('Error getting user profile:', error);
        throw new Error('Failed to get user profile');
    }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Checks if a username is already taken
 * 
 * Used during registration and username changes to prevent duplicates.
 * Returns false if username is available or on database errors (fail-safe).
 * 
 * @param username - Username to check
 * @returns true if username exists, false if available
 * @throws Error if database operation fails
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
    try {
        // Query only the ID to minimize data transfer
        const { data, error } = await supabase
            .from('User')
            .select('user_id')
            .eq('username', username)
            .single();

        // Username is available
        if (error) {
            if (error.code === POSTGRES_NOT_FOUND_CODE) {
                return false; // Username doesn't exist (available)
            }
            throw error;
        }

        // Username exists
        return !!data;
    } catch (error: unknown) {
        console.error('Error checking username existence:', error);
        throw new Error('Failed to check username');
    }
}

// ============================================================================
// User Update Functions
// ============================================================================

/**
 * Updates user details across User and UserProfile tables
 * 
 * Can update User table fields (username) and/or UserProfile fields
 * (first_name, last_name, etc.) in a single operation.
 * Uses upsert for profile to handle cases where profile doesn't exist yet.
 * 
 * @param email - User's email (used as lookup key)
 * @param userData - Fields to update in User table (username)
 * @param profileData - Fields to update in UserProfile table
 * @returns Complete updated user with profile
 * @throws Error if database operation fails
 */
export async function updateUserDetails(
    email: string,
    userData?: Partial<Pick<User, 'username'>>,
    profileData?: Partial<UserProfile>
): Promise<CompleteUser> {
    try {
        let updatedUser: User;

        // Update User table if userData provided
        if (userData && Object.keys(userData).length > 0) {
            const { data, error } = await supabase
                .from('User')
                .update(userData)
                .eq('email', email)
                .select('*')
                .single();

            if (error) throw error;
            updatedUser = data;
        } else {
            // No User updates, just fetch current user
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .eq('email', email)
                .single();

            if (error) throw error;
            updatedUser = data;
        }

        // Update or create UserProfile if profileData provided
        if (profileData && Object.keys(profileData).length > 0) {
            const { error: profileError } = await supabase
                .from('UserProfile')
                .upsert({
                    email,
                    ...profileData,
                    updated_at: new Date().toISOString()
                });

            if (profileError) throw profileError;
        }

        // Fetch and return complete updated user
        return await findUserByEmail(email) as CompleteUser;
    } catch (error: unknown) {
        console.error('Error updating user details:', error);
        throw new Error('Failed to update user details');
    }
}

/**
 * Updates a user's password hash
 * 
 * Used for password changes and password reset completion.
 * Only updates the password_hash field in User table.
 * 
 * @param userId - User's unique identifier
 * @param passwordHash - New bcrypt password hash
 * @throws Error if database operation fails
 */
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('User')
            .update({ password_hash: passwordHash })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error updating user password:', error);
        throw new Error('Failed to update password');
    }
}

// ============================================================================
// User Deletion Functions
// ============================================================================

/**
 * Deletes a user and all their related data
 * 
 * Performs cleanup in this order:
 * 1. Delete password reset tokens (manual cleanup)
 * 2. Delete user record (cascades to UserProfile automatically)
 * 
 * Note: Avatar files in storage must be deleted separately using deleteUserAvatar()
 * 
 * @param userId - User's unique identifier
 * @throws Error if database operation fails
 */
export async function deleteUser(userId: number): Promise<void> {
    try {
        // First, delete any password reset tokens
        await supabase
            .from('PasswordResetTokens')
            .delete()
            .eq('user_id', userId);

        // Then delete the user (cascades to UserProfile via foreign key)
        const { error } = await supabase
            .from('User')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
    }
}

/**
 * Deletes a user's avatar image from Supabase storage
 * 
 * Extracts the file path from the avatar URL and removes it from storage.
 * Should be called before deleting user if they have an avatar.
 * 
 * @param avatarUrl - Full URL to the avatar image
 * @throws Error if storage operation fails
 */
export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
    try {
        // Extract file name from URL
        // Example URL: https://project.supabase.co/storage/v1/object/public/UserAvatars/avatars/file.jpg
        const url = new URL(avatarUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const filePath = `avatars/${fileName}`;

        // Delete from storage bucket
        const { error } = await supabase.storage
            .from('UserAvatars')
            .remove([filePath]);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting user avatar:', error);
        throw new Error('Failed to delete user avatar');
    }
}

// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Stores a password reset token in the database
 * 
 * Creates a temporary token record that expires after a set time.
 * Used in the "forgot password" flow.
 * 
 * @param tokenData - Token information (userId, email, token, expiresAt)
 * @throws Error if database operation fails
 */
export async function storePasswordResetToken(tokenData: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
}): Promise<void> {
    try {
        const { error } = await supabase
            .from('PasswordResetTokens')
            .insert({
                user_id: tokenData.userId,
                email: tokenData.email,
                token: tokenData.token,
                expires_at: tokenData.expiresAt.toISOString()
            });

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error storing password reset token:', error);
        throw new Error('Failed to store reset token');
    }
}

/**
 * Finds a valid password reset token
 * 
 * Looks up a token and verifies:
 * 1. Token matches
 * 2. Email matches
 * 3. Token hasn't expired yet
 * 
 * Returns null if token not found or expired (not an error).
 * 
 * @param email - User's email address
 * @param token - Reset token string
 * @returns Token data if valid, null if not found/expired
 * @throws Error if database operation fails
 */
export async function findValidResetToken(
    email: string,
    token: string
): Promise<PasswordResetToken | null> {
    try {
        const { data, error } = await supabase
            .from('PasswordResetTokens')
            .select('*')
            .eq('email', email)
            .eq('token', token)
            .gt('expires_at', new Date().toISOString()) // Greater than now = not expired
            .single();

        // Token not found or expired
        if (error) {
            if (error.code === POSTGRES_NOT_FOUND_CODE) {
                return null; // Invalid or expired token
            }
            throw error;
        }

        return data;
    } catch (error: unknown) {
        console.error('Error finding reset token:', error);
        throw new Error('Failed to find reset token');
    }
}

/**
 * Deletes a password reset token from the database
 * 
 * Called after successful password reset to prevent token reuse.
 * Also used to clean up expired tokens.
 * 
 * @param tokenId - Token's unique identifier
 * @throws Error if database operation fails
 */
export async function deleteResetToken(tokenId: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('PasswordResetTokens')
            .delete()
            .eq('id', tokenId);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting reset token:', error);
        throw new Error('Failed to delete reset token');
    }
}


/**
 * Creates or updates a user account from Google OAuth
 * 
 * Handles Google Sign-In by:
 * 1. Checking if user exists by Firebase UID or email
 * 2. Creating new user if doesn't exist
 * 3. Updating existing user profile if already exists
 * 4. No password hash needed (OAuth authentication)
 * 
 * @param googleData - Google user profile data
 * @returns Complete user data in UserResponse format
 * @throws Error if upsert operation fails
 */
export async function upsertGoogleUser(googleData: {
    firebaseUid: string;
    email: string | null;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
}): Promise<CompleteUser> {
    const { firebaseUid, email, username, firstName, lastName, avatarUrl } = googleData;

    try {
        const normalizedEmail = email ? normalizeEmail(email) : null;

        // Check if user already exists by email
        let existingUser = normalizedEmail ? await findUserByEmail(normalizedEmail) : null;

        if (existingUser) {
            // User exists - update profile with latest Google data
            console.log(`Updating existing user from Google: ${normalizedEmail}`);

            // Update profile if new data available
            if (firstName || lastName || avatarUrl) {
                const { error: profileError } = await supabase
                    .from('UserProfile')
                    .upsert({
                        email: normalizedEmail!,
                        first_name: firstName || existingUser.profile?.first_name || null,
                        last_name: lastName || existingUser.profile?.last_name || null,
                        avatar_url: avatarUrl || existingUser.profile?.avatar_url || null,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'email'
                    });

                if (profileError) {
                    console.error('Profile update failed:', profileError);
                }
            }

            // Fetch updated user data
            const updatedUser = await findUserByEmail(normalizedEmail!);
            return updatedUser!;

        } else {
            // New user - create account
            console.log(`Creating new user from Google: ${normalizedEmail}`);

            const { data: newUser, error: userError } = await supabase
                .from('User')
                .insert({
                    email: normalizedEmail,
                    username: username,
                    password_hash: null, // No password for OAuth users
                   //firebase_uid: firebaseUid, // Store Firebase UID for linking
                    created_at: new Date().toISOString(),
                    user_role: "user"
                })
                .select('*')
                .single();

            if (userError) {
                if (userError.code === '23505') {
                    if (userError.message.includes('email')) {
                        throw new Error('Email already registered');
                    }
                    if (userError.message.includes('username')) {
                        throw new Error('Username already taken');
                    }
                }
                throw userError;
            }

            // Create profile
            if (firstName || lastName || avatarUrl) {
                const { error: profileError } = await supabase
                    .from('UserProfile')
                    .insert({
                        email: normalizedEmail!,
                        first_name: firstName,
                        last_name: lastName,
                        avatar_url: avatarUrl,
                        updated_at: new Date().toISOString()
                    });

                if (profileError) {
                    console.error('Profile creation failed:', profileError);
                }
            }

            // Fetch complete user data
            const completeUser = await findUserByEmail(normalizedEmail!);
            if (!completeUser) {
                throw new Error('Failed to retrieve created user');
            }

            return completeUser;
        }

    } catch (error: unknown) {
        console.error('Error upserting Google user:', error);
        throw error;
    }
}

function normalizeEmail(email: string) {
    return email.toLowerCase().trim();
}
// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: Check if email exists during registration
 * 
 * const existingUser = await findUserByEmail('user@example.com');
 * if (existingUser) {
 *   throw new Error('Email already registered');
 * }
 * 
 * EXAMPLE 2: Update user profile
 * 
 * await updateUserDetails(
 *   'user@example.com',
 *   { username: 'newusername' },
 *   { first_name: 'John', last_name: 'Doe', organisation: 'Acme Inc' }
 * );
 * 
 * EXAMPLE 3: Password reset flow
 * 
 * // Generate and store token
 * const token = crypto.randomBytes(32).toString('hex');
 * await storePasswordResetToken({
 *   userId: user.user_id,
 *   email: user.email,
 *   token: token,
 *   expiresAt: new Date(Date.now() + 3600000) // 1 hour
 * });
 * 
 * // Later: Validate token
 * const resetToken = await findValidResetToken(email, token);
 * if (!resetToken) {
 *   throw new Error('Invalid or expired token');
 * }
 * 
 * // Reset password
 * const newHash = await bcrypt.hash(newPassword, 10);
 * await updateUserPassword(resetToken.user_id, newHash);
 * await deleteResetToken(resetToken.id);
 * 
 * EXAMPLE 4: Delete user account
 * 
 * const user = await findUserByEmail('user@example.com');
 * if (user?.profile?.avatar_url) {
 *   await deleteUserAvatar(user.profile.avatar_url);
 * }
 * await deleteUser(user.user_id);
 */