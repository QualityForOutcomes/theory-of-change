/**
 * User Terms & Conditions Utilities
 * 
 * Manages user acceptance of Terms and Conditions.
 * Tracks when users accept T&C and provides admin reporting functions.
 * 
 * Table: UserTermsAcceptance
 * - email: User's email (unique, primary key)
 * - accepted_at: Timestamp when terms were accepted
 * 
 * Use Cases:
 * - Record T&C acceptance during registration
 * - Check if user has accepted current terms
 * - Admin reporting on acceptance rates
 * - Update acceptance timestamp when terms change
 */

import { UserTermsAcceptance } from '../../dto/UserTermsAcceptance';
import { createClient } from '@supabase/supabase-js';

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
 * PostgreSQL error code for unique constraint violation
 * Used when user tries to accept terms multiple times
 */
const UNIQUE_VIOLATION_CODE = '23505';

/**
 * PostgreSQL error code for "no rows found"
 * Used to distinguish between "not found" vs actual errors
 */
const NOT_FOUND_CODE = 'PGRST116';

// ============================================================================
// Core CRUD Functions
// ============================================================================

/**
 * Records user's acceptance of Terms and Conditions
 * 
 * Creates a new record with current timestamp.
 * Email is normalized to lowercase for consistency.
 * Throws specific error if user already accepted (idempotency check).
 * 
 * @param email - User's email address
 * @returns Created acceptance record with timestamp
 * @throws Error with code 'TERMS_ALREADY_ACCEPTED' if duplicate
 * @throws Error if database operation fails
 */
export async function createTermsAcceptance(email: string): Promise<UserTermsAcceptance> {
    try {
        // Prepare acceptance data with normalized email
        const acceptanceData = {
            email: email.toLowerCase(),
            accepted_at: new Date().toISOString()
        };

        // Insert record into database
        const { data, error } = await supabase
            .from('UserTermsAcceptance')
            .insert(acceptanceData)
            .select('*')
            .single();

        // Handle unique constraint violation (already accepted)
        if (error) {
            if (error.code === UNIQUE_VIOLATION_CODE) {
                throw new Error('TERMS_ALREADY_ACCEPTED');
            }
            throw error;
        }

        // Return formatted acceptance record
        return {
            email: data.email,
            accepted_at: new Date(data.accepted_at)
        };
    } catch (error: unknown) {
        console.error('Error creating terms acceptance:', error);
        throw error;
    }
}

/**
 * Finds terms acceptance record by email
 * 
 * Looks up whether user has accepted terms.
 * Returns null if no record found (user hasn't accepted).
 * 
 * @param email - User's email address
 * @returns Acceptance record if found, null if not found
 * @throws Error if database operation fails
 */
export async function findTermsAcceptanceByEmail(email: string): Promise<UserTermsAcceptance | null> {
    try {
        const { data, error } = await supabase
            .from('UserTermsAcceptance')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        // Handle "not found" gracefully
        if (error) {
            if (error.code === NOT_FOUND_CODE) {
                return null; // User hasn't accepted terms
            }
            throw error;
        }

        // Return formatted record
        return {
            email: data.email,
            accepted_at: new Date(data.accepted_at)
        };
    } catch (error: unknown) {
        console.error('Error finding terms acceptance:', error);
        throw new Error('Failed to find terms acceptance');
    }
}

/**
 * Checks if user has accepted Terms and Conditions
 * 
 * Simple boolean check for whether acceptance record exists.
 * Returns false on errors to fail-safe (doesn't block user flow).
 * 
 * @param email - User's email address
 * @returns true if user accepted terms, false if not or on error
 */
export async function hasAcceptedTerms(email: string): Promise<boolean> {
    try {
        const acceptance = await findTermsAcceptanceByEmail(email);
        return acceptance !== null;
    } catch (error: unknown) {
        console.error('Error checking terms acceptance:', error);
        return false; // Fail-safe: don't block user on error
    }
}

/**
 * Updates terms acceptance timestamp
 * 
 * Used when terms are updated and user re-accepts.
 * Updates the accepted_at timestamp to current time.
 * 
 * @param email - User's email address
 * @returns Updated acceptance record
 * @throws Error if database operation fails or record not found
 */
export async function updateTermsAcceptance(email: string): Promise<UserTermsAcceptance> {
    try {
        const { data, error } = await supabase
            .from('UserTermsAcceptance')
            .update({ accepted_at: new Date().toISOString() })
            .eq('email', email.toLowerCase())
            .select('*')
            .single();

        if (error) throw error;

        return {
            email: data.email,
            accepted_at: new Date(data.accepted_at)
        };
    } catch (error: unknown) {
        console.error('Error updating terms acceptance:', error);
        throw new Error('Failed to update terms acceptance');
    }
}

/**
 * Deletes terms acceptance record
 * 
 * Removes user's T&C acceptance record from database.
 * Used for account cleanup or admin operations.
 * 
 * @param email - User's email address
 * @throws Error if database operation fails
 */
export async function deleteTermsAcceptance(email: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('UserTermsAcceptance')
            .delete()
            .eq('email', email.toLowerCase());

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting terms acceptance:', error);
        throw new Error('Failed to delete terms acceptance');
    }
}

// ============================================================================
// Admin / Reporting Functions
// ============================================================================

/**
 * Gets all terms acceptances (admin function)
 * 
 * Retrieves all acceptance records sorted by date (newest first).
 * Use for admin dashboards or compliance reporting.
 * 
 * Warning: Can be slow with large datasets. Consider pagination.
 * 
 * @returns Array of all acceptance records
 * @throws Error if database operation fails
 */
export async function getAllTermsAcceptances(): Promise<UserTermsAcceptance[]> {
    try {
        const { data, error } = await supabase
            .from('UserTermsAcceptance')
            .select('*')
            .order('accepted_at', { ascending: false });

        if (error) throw error;

        // Convert ISO strings to Date objects
        return data.map(item => ({
            email: item.email,
            accepted_at: new Date(item.accepted_at)
        }));
    } catch (error: unknown) {
        console.error('Error getting all terms acceptances:', error);
        throw new Error('Failed to get terms acceptances');
    }
}

/**
 * Gets terms acceptances after a specific date
 * 
 * Useful for tracking acceptances of updated terms.
 * Example: Get all users who accepted terms after the last T&C update.
 * 
 * @param date - Cutoff date (returns acceptances after this date)
 * @returns Array of acceptance records after the date
 * @throws Error if database operation fails
 */
export async function getTermsAcceptancesAfter(date: Date): Promise<UserTermsAcceptance[]> {
    try {
        const { data, error } = await supabase
            .from('UserTermsAcceptance')
            .select('*')
            .gt('accepted_at', date.toISOString()) // Greater than date
            .order('accepted_at', { ascending: false });

        if (error) throw error;

        // Convert ISO strings to Date objects
        return data.map(item => ({
            email: item.email,
            accepted_at: new Date(item.accepted_at)
        }));
    } catch (error: unknown) {
        console.error('Error getting terms acceptances after date:', error);
        throw new Error('Failed to get terms acceptances');
    }
}

/**
 * Gets total count of terms acceptances
 * 
 * Returns the total number of users who have accepted terms.
 * Efficient count query without fetching all data.
 * Useful for compliance reporting and metrics.
 * 
 * @returns Total number of acceptances
 * @throws Error if database operation fails
 */
export async function getTermsAcceptanceCount(): Promise<number> {
    try {
        // Use count query (more efficient than fetching all rows)
        const { count, error } = await supabase
            .from('UserTermsAcceptance')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return count || 0;
    } catch (error: unknown) {
        console.error('Error getting terms acceptance count:', error);
        throw new Error('Failed to get terms acceptance count');
    }
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: During user registration
 * 
 * if (userData.acceptTerms) {
 *   try {
 *     await createTermsAcceptance(userData.email);
 *   } catch (error) {
 *     if (error.message === 'TERMS_ALREADY_ACCEPTED') {
 *       // User already accepted, continue
 *     } else {
 *       throw error;
 *     }
 *   }
 * }
 * 
 * EXAMPLE 2: Check before allowing access
 * 
 * const hasAccepted = await hasAcceptedTerms(user.email);
 * if (!hasAccepted) {
 *   return res.status(403).json({
 *     error: 'You must accept terms and conditions'
 *   });
 * }
 * 
 * EXAMPLE 3: When terms are updated
 * 
 * // Find users who accepted before the update
 * const termsUpdateDate = new Date('2025-01-01');
 * const oldAcceptances = await getTermsAcceptancesAfter(termsUpdateDate);
 * 
 * // Notify these users to re-accept
 * for (const acceptance of oldAcceptances) {
 *   if (acceptance.accepted_at < termsUpdateDate) {
 *     await sendReacceptanceEmail(acceptance.email);
 *   }
 * }
 * 
 * EXAMPLE 4: Admin dashboard metrics
 * 
 * const totalUsers = await getUserCount();
 * const acceptedCount = await getTermsAcceptanceCount();
 * const acceptanceRate = (acceptedCount / totalUsers) * 100;
 * 
 * console.log(`${acceptanceRate}% of users accepted terms`);
 * 
 * EXAMPLE 5: Re-acceptance flow
 * 
 * // User re-accepts updated terms
 * try {
 *   await updateTermsAcceptance(user.email);
 * } catch (error) {
 *   // If no existing record, create new one
 *   await createTermsAcceptance(user.email);
 * }
 */