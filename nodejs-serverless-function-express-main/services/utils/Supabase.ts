// services/utils/Supabase.ts - Updated for your table structure

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    //process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //process.env.SUPABASE_SERVICE_ROLE_KEY!

    process.env.TOC_SUPABASE_URL!,
    process.env.TOC_SUPABASE_SERVICE_ROLE_KEY!
);

// Type definitions matching your schema
export interface User {
    user_id: number;
    email: string;
    username?: string;
    password_hash: string;
    created_at: Date;
}

export interface UserProfile {
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    organisation?: string;
    updated_at: Date;
}

export interface CompleteUser extends User {
    profile?: UserProfile;
}

export interface PasswordResetToken {
    id: number;
    user_id: number;
    email: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}

// Find user by email (joins with profile)
export async function findUserByEmail(email: string): Promise<CompleteUser | null> {
    try {
        const { data, error } = await supabase
            .from('User')
            .select(`
        *,
        profile:UserProfile(*)
      `)
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw error;
        }

        return {
            ...data,
            profile: data.profile || null
        };
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw new Error('Failed to find user');
    }
}

// Find user by ID (joins with profile)
export async function findUserById(userId: number): Promise<CompleteUser | null> {
    try {
        const { data, error } = await supabase
            .from('User')
            .select(`
        *,
        profile:UserProfile(*)
      `)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw error;
        }

        return {
            ...data,
            profile: data.profile || null
        };
    } catch (error) {
        console.error('Error finding user by ID:', error);
        throw new Error('Failed to find user');
    }
}

// Check if username exists
export async function checkUsernameExists(username: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('User')
            .select('user_id')
            .eq('username', username)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return false;
            }
            throw error;
        }

        return !!data;
    } catch (error) {
        console.error('Error checking username existence:', error);
        throw new Error('Failed to check username');
    }
}

// Update user details (updates both User and UserProfile tables)
export async function updateUserDetails(
    email: string,
    userData?: Partial<Pick<User, 'username'>>,
    profileData?: Partial<UserProfile>
): Promise<CompleteUser> {
    try {
        // Start a transaction-like operation
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
            // Get current user data
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .eq('email', email)
                .single();

            if (error) throw error;
            updatedUser = data;
        }

        // Update or create UserProfile
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

        // Return complete user with profile
        return await findUserByEmail(email) as CompleteUser;
    } catch (error) {
        console.error('Error updating user details:', error);
        throw new Error('Failed to update user details');
    }
}

// Update user password
export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('User')
            .update({ password_hash: passwordHash })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating user password:', error);
        throw new Error('Failed to update password');
    }
}

// Delete user (cascades to UserProfile automatically)
export async function deleteUser(userId: number): Promise<void> {
    try {
        // Delete related password reset tokens first
        await supabase
            .from('PasswordResetTokens')
            .delete()
            .eq('user_id', userId);

        // Delete user (UserProfile will be deleted automatically due to CASCADE)
        const { error } = await supabase
            .from('User')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
    }
}

// Delete user avatar from storage
export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
    try {
        // Extract file path from URL
        const url = new URL(avatarUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const filePath = `avatars/${fileName}`;

        const { error } = await supabase.storage
            .from('UserAvatars')
            .remove([filePath]);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting user avatar:', error);
        throw new Error('Failed to delete user avatar');
    }
}

// Get user profile for display
export async function getUserProfile(email: string): Promise<{
    user_id: number;
    email: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    organisation?: string;
    avatar_url?: string;
    display_name: string;
    created_at: Date;
} | null> {
    try {
        const user = await findUserByEmail(email);

        if (!user) return null;

        const profile = user.profile;
        const displayName = profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : user.username || user.email;

        return {
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            organisation: profile?.organisation,
            avatar_url: profile?.avatar_url,
            display_name: displayName || user.email,
            created_at: user.created_at
        };
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw new Error('Failed to get user profile');
    }
}

// Password reset token functions (existing functionality)
export async function storePasswordResetToken(tokenData: {
    userId: number;
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
    } catch (error) {
        console.error('Error storing password reset token:', error);
        throw new Error('Failed to store reset token');
    }
}

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
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error finding reset token:', error);
        throw new Error('Failed to find reset token');
    }
}

export async function deleteResetToken(tokenId: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('PasswordResetTokens')
            .delete()
            .eq('id', tokenId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting reset token:', error);
        throw new Error('Failed to delete reset token');
    }
}