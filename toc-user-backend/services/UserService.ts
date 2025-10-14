/**
 * User Service
 * 
 * Handles all user-related business logic and database operations.
 * Manages user lifecycle including:
 * - User registration with profile creation
 * - Email and username uniqueness validation
 * - Password hashing and security
 * - User profile retrieval and updates
 * - Terms and conditions acceptance tracking
 * - Newsletter subscription management
 * - User preferences management
 * 
 * Uses Supabase for database operations across multiple tables:
 * - User: Core authentication data
 * - UserProfile: Extended user information
 * - UserTermsAcceptance: T&C acceptance records
 * - NewsletterSubscription: Newsletter preferences
 */

import { createClient } from '@supabase/supabase-js';
import {
    findUserByEmail,
    checkUsernameExists as checkUsernameInDB,
    updateUserDetails,
    getUserProfile as getSupabaseUserProfile
} from '../utils/supabaseUtils/UserUtils';
import { createTermsAcceptance, hasAcceptedTerms } from '../utils/supabaseUtils/UserTermsUtils';
import {
    createNewsletterSubscription,
    isSubscribedToNewsletter
} from '../utils/supabaseUtils/NewsletterUtils';

import { UserProfile } from '../dto/UserProfile';
import { CompleteUser } from '../dto/CompleteUser';
import { User } from '../dto/User';
import { UserData } from '../entities/user/UserData';
import UserResponse from '../entities/user/UserResponse';
import ValidationUtils from '../validators/ValidationUtils';
import { UserTermsAcceptance } from '../dto/UserTermsAcceptance';
import { UserNewsLetterSubs } from '../dto/UserNewsLetterSubs';

// ============================================================================
// Supabase Client Initialization
// ============================================================================

/**
 * Supabase client instance with service role key
 * Uses service role for administrative operations like user creation
 * 
 * NOTE: Service role key has elevated privileges - use carefully
 */
const supabase = createClient(
    process.env.TOC_SUPABASE_URL!,
    process.env.TOC_SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes email address to lowercase for consistent storage
 * 
 * Email addresses are case-insensitive, so we normalize to prevent
 * duplicate accounts like "User@Email.com" and "user@email.com"
 * 
 * @param email - Raw email address
 * @returns Lowercase email address
 */
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

/**
 * Formats display name from user profile data
 * 
 * Priority order for display name:
 * 1. First name + Last name (if both available)
 * 2. Username (if available)
 * 3. Email address (fallback)
 * 
 * @param profile - User profile data (optional)
 * @param username - Username (optional)
 * @param email - User email (required fallback)
 * @returns Formatted display name
 */
function formatDisplayName(
    profile: { first_name?: string | null; last_name?: string | null } | null,
    username: string | null,
    email: string
): string {
    if (profile) {
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        if (fullName) {
            return fullName;
        }
    }

    return username || email;
}

/**
 * Maps CompleteUser database record to UserResponse format
 * 
 * Transforms snake_case database fields to camelCase API response
 * and formats display name appropriately.
 * 
 * @param completeUser - Complete user data from database
 * @returns Formatted UserResponse object
 */
function mapToUserResponse(completeUser: {
    user_id: number;
    email: string;
    username: string | null;
    created_at: Date;
    user_role: string;
    profile?: {
        first_name?: string;
        last_name?: string;
        organisation?: string;
        avatar_url?: string | null;
    } | null;
}): UserResponse {
    const profile = completeUser.profile;
    const displayName = formatDisplayName(profile || null, completeUser.username, completeUser.email);

    return {
        userId: completeUser.user_id,
        email: completeUser.email,
        username: completeUser.username || completeUser.email,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        organisation: profile?.organisation,
        avatarUrl: profile?.avatar_url || "",
        displayName: displayName,
        createdAt: completeUser.created_at,
        userRole: completeUser.user_role
    };
}

/**
 * Handles post-registration optional preferences (Terms & Newsletter)
 * 
 * This is separated from main user creation to ensure user account
 * is created even if preference recording fails.
 * 
 * @param email - User email address
 * @param acceptTandC - Whether user accepted terms
 * @param newsLetterSubs - Whether user subscribed to newsletter
 */
async function recordUserPreferences(
    email: string,
    acceptTandC?: boolean,
    newsLetterSubs?: boolean
): Promise<void> {
    // Handle Terms and Conditions acceptance
    if (acceptTandC) {
        try {
            await createTermsAcceptance(email);
            console.log('Terms and conditions acceptance recorded successfully');
        } catch (termsError: unknown) {
            console.error('Terms acceptance failed:', termsError);
            // Don't fail user creation, but log the error
            // In production, consider implementing retry logic or admin notification
        }
    }

    // Handle Newsletter subscription
    if (newsLetterSubs) {
        try {
            await createNewsletterSubscription(email);
            console.log('Newsletter subscription recorded successfully');
        } catch (newsletterError: unknown) {
            console.error('Newsletter subscription failed:', newsletterError);
            // Don't fail user creation, but log the error
        }
    }
}


/**
 * Checks if an email address is already registered
 * 
 * Performs case-insensitive lookup to prevent duplicate accounts.
 * Returns false on error to prevent blocking registration attempts.
 * 
 * @param email - Email address to check
 * @returns True if email exists, false if available or on error
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    try {
        const normalizedEmail = normalizeEmail(email);
        const user = await findUserByEmail(normalizedEmail);
        return !!user;
    } catch (error: unknown) {
        console.error('Error checking email existence:', error);
        // Return false on error to prevent blocking legitimate registrations
        return false;
    }
}

/**
 * Checks if a username is already taken
 * 
 * Usernames must be unique across the platform.
 * Returns false on error to prevent blocking registration attempts.
 * 
 * @param username - Username to check
 * @returns True if username exists, false if available or on error
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
    try {
        return await checkUsernameInDB(username);
    } catch (error: unknown) {
        console.error('Error checking username existence:', error);
        // Return false on error to prevent blocking legitimate registrations
        return false;
    }
}


/**
 * Retrieves complete user profile by email address
 * 
 * Fetches user data from both User and UserProfile tables.
 * Returns null if user not found.
 * 
 * @param email - User's email address
 * @returns UserResponse with complete profile data or null if not found
 * @throws Error if database operation fails
 */
export async function getUserProfile(email: string): Promise<UserResponse | null> {
    try {
        const normalizedEmail = normalizeEmail(email);
        const user = await getSupabaseUserProfile(normalizedEmail);

        if (!user) {
            return null;
        }

        return user; // Already in the correct UserResponse format from utility
    } catch (error: unknown) {
        console.error('Error getting user profile:', error);
        throw new Error('Failed to get user profile');
    }
}



/**
 * Creates a new user account with optional profile and preferences
 * 
 * Multi-step process:
 * 1. Hash password for secure storage
 * 2. Create user record in User table
 * 3. Create profile record in UserProfile table (if data provided)
 * 4. Record terms acceptance (if accepted)
 * 5. Record newsletter subscription (if subscribed)
 * 6. Fetch complete user data and return formatted response
 * 
 * Error Handling:
 * - Throws specific errors for email/username conflicts (EMAIL_TAKEN, USERNAME_TAKEN)
 * - Continues user creation even if profile/preferences recording fails
 * - Logs non-critical failures for monitoring
 * 
 * Transaction Note:
 * Currently not using database transactions. In production, consider
 * implementing proper transaction handling to ensure data consistency.
 * 
 * @param userData - Complete user registration data
 * @returns Created user data in UserResponse format
 * @throws Error with specific code if email/username taken or creation fails
 */
export async function createUser(userData: UserData): Promise<UserResponse> {
    const {
        email,
        password,
        username,
        firstName,
        lastName,
        organisation,
        acceptTandC,
        newsLetterSubs
    } = userData;

    try {
        const normalizedEmail = normalizeEmail(email);

        // STEP 1: Hash password for secure storage
        const passwordHash = await ValidationUtils.hashPassword(password);

        // STEP 2: Create user in User table
        console.log(`Creating user account for email: ${normalizedEmail}`);
        const { data: newUser, error: userError } = await supabase
            .from('User')
            .insert({
                email: normalizedEmail,
                username: username || null,
                password_hash: passwordHash,
                created_at: new Date().toISOString(),
                user_role: "user" // Default role for new users
            })
            .select('*')
            .single();

        // Handle unique constraint violations
        if (userError) {
            if (userError.code === '23505') { // PostgreSQL unique violation code
                if (userError.message.includes('email')) {
                    throw new Error('Email already registered');
                }
                if (userError.message.includes('username')) {
                    throw new Error('Username already taken');
                }
            }
            throw userError;
        }

        // STEP 3: Create profile in UserProfile table (if profile data provided)
        if (firstName || lastName || organisation) {
            console.log(`Creating user profile for: ${normalizedEmail}`);
            const { error: profileError } = await supabase
                .from('UserProfile')
                .insert({
                    email: normalizedEmail,
                    first_name: firstName || null,
                    last_name: lastName || null,
                    organisation: organisation || null,
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                // IMPORTANT: Profile creation failure should not prevent user registration
                // In production, implement compensating transaction or admin alert
                console.error('Profile creation failed:', profileError);
                // Consider: Should we throw here or continue?
                // Current behavior: Continue with user creation
            }
        }

        // STEP 4 & 5: Record user preferences (non-blocking)
        await recordUserPreferences(normalizedEmail, acceptTandC, newsLetterSubs);

        // STEP 6: Fetch complete user data with joined profile
        console.log(`Fetching complete user data for: ${normalizedEmail}`);
        const completeUser = await findUserByEmail(normalizedEmail);

        if (!completeUser) {
            throw new Error('Failed to retrieve created user');
        }

        // Format and return response
        return mapToUserResponse(completeUser);

    } catch (error: unknown) {
        console.error('Error creating user:', error);
        throw error;
    }
}


/**
 * Updates user preferences for terms acceptance and newsletter subscription
 * 
 * Can be called post-registration to update preferences independently.
 * Handles both opt-in and opt-out for newsletter subscriptions.
 * 
 * Use Cases:
 * - User changes preferences in account settings
 * - User accepts terms after initial registration
 * - User subscribes/unsubscribes from newsletter
 * 
 * @param email - User's email address
 * @param acceptTandC - Optional: true to record terms acceptance
 * @param newsLetterSubs - Optional: true to subscribe, false to unsubscribe
 * @throws Error if preference update fails
 */
export async function updateUserPreferences(
    email: string,
    acceptTandC?: boolean,
    newsLetterSubs?: boolean
): Promise<void> {
    try {
        const normalizedEmail = normalizeEmail(email);

        // Handle Terms and Conditions acceptance
        if (acceptTandC === true) {
            try {
                await createTermsAcceptance(normalizedEmail);
                console.log(`Terms acceptance recorded for: ${normalizedEmail}`);
            } catch (error: unknown) {
                // Check if already accepted (idempotent operation)
                if ((error as Error).message === 'TERMS_ALREADY_ACCEPTED') {
                    console.log('Terms already accepted by user');
                } else {
                    throw error;
                }
            }
        }

        // Handle Newsletter subscription
        if (newsLetterSubs === true) {
            // Subscribe to newsletter
            try {
                await createNewsletterSubscription(normalizedEmail);
                console.log(`Newsletter subscription created for: ${normalizedEmail}`);
            } catch (error: unknown) {
                // Check if already subscribed (idempotent operation)
                if ((error as Error).message === 'NEWSLETTER_ALREADY_SUBSCRIBED') {
                    console.log('User already subscribed to newsletter');
                } else {
                    throw error;
                }
            }
        } else if (newsLetterSubs === false) {
            // Unsubscribe from newsletter
            try {
                // Dynamic import to avoid circular dependencies
                const { unsubscribeFromNewsletter } = await import('../utils/supabaseUtils/NewsletterUtils');
                await unsubscribeFromNewsletter(normalizedEmail);
                console.log(`Newsletter unsubscription processed for: ${normalizedEmail}`);
            } catch (error: unknown) {
                console.error('Failed to unsubscribe from newsletter:', error);
                throw new Error('Failed to update newsletter preferences');
            }
        }

    } catch (error: unknown) {
        console.error('Error updating user preferences:', error);
        throw new Error('Failed to update user preferences');
    }
}

/**
 * Retrieves user's current preference states
 * 
 * Checks both terms acceptance and newsletter subscription status.
 * Useful for displaying current preferences in user settings.
 * 
 * @param email - User's email address
 * @returns Object containing current preference states
 * @throws Error if preference retrieval fails
 */
export async function getUserPreferences(email: string): Promise<{
    hasAcceptedTerms: boolean;
    isSubscribedToNewsletter: boolean;
}> {
    try {
        const normalizedEmail = normalizeEmail(email);

        // Fetch both preferences in parallel for efficiency
        const [termsAccepted, newsletterSubscribed] = await Promise.all([
            hasAcceptedTerms(normalizedEmail),
            isSubscribedToNewsletter(normalizedEmail)
        ]);

        return {
            hasAcceptedTerms: termsAccepted,
            isSubscribedToNewsletter: newsletterSubscribed
        };
    } catch (error: unknown) {
        console.error('Error getting user preferences:', error);
        throw new Error('Failed to get user preferences');
    }
}


// ============================================================================
// Notes for Future Improvements
// ============================================================================

/*
 * TRANSACTION HANDLING:
 * Current implementation does not use database transactions for user creation.
 * Consider implementing proper transaction handling to ensure:
 * - User and profile are created atomically
 * - Rollback on partial failures
 * - Data consistency across tables
 * 
 * RETRY LOGIC:
 * Preference recording failures are currently logged but ignored.
 * Consider implementing:
 * - Retry mechanism for transient failures
 * - Background job queue for failed operations
 * - Admin notification for persistent failures
 * 
 * SECURITY:
 * - Service role key has full database access
 * - Consider implementing row-level security policies
 * - Audit user creation and preference changes
 * 
 * VALIDATION:
 * - Email format validation should happen before database operations
 * - Username format validation (length, characters, etc.)
 * - Password strength requirements
 */