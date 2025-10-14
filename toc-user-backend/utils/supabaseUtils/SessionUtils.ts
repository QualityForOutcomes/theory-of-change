/**
 * Session Management Utilities
 * 
 * Tracks user login/logout sessions for analytics and monitoring.
 * Records when users log in and out to measure engagement and activity.
 * 
 * Table: UserSession
 * - session_id: Unique session identifier (auto-generated)
 * - user_id: User who owns the session
 * - login_at: When session started (login time)
 * - logout_at: When session ended (logout time, null if still active)
 * 
 * Use Cases:
 * - Track user activity patterns
 * - Calculate Daily Active Users (DAU)
 * - Monitor concurrent sessions
 * - Analyze session duration
 */

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
 * Time window to consider a session "active"
 * Sessions without logout within this window are considered active
 */
const ACTIVE_SESSION_WINDOW_MINUTES = 30;

// ============================================================================
// Session Lifecycle Functions
// ============================================================================

/**
 * Creates a new session when user logs in
 * 
 * Records the login timestamp with logout_at set to null (active session).
 * Call this immediately after successful authentication.
 * 
 * @param userId - User's unique identifier
 * @returns Created session record with session_id
 * @throws Error if database operation fails
 */
export async function createUserSession(userId: number) {
    try {
        const { data, error } = await supabase
            .from('UserSession')
            .insert({
                user_id: userId,
                login_at: new Date().toISOString(),
                logout_at: null // Null indicates active session
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error creating user session:', error);
        throw new Error('Failed to create session');
    }
}

/**
 * Closes the most recent active session when user logs out
 * 
 * Finds the user's latest session without a logout_at timestamp
 * and sets it to the current time. Handles cases where user has
 * no active sessions gracefully.
 * 
 * @param userId - User's unique identifier
 * @throws Error if database operation fails
 */
export async function closeUserSession(userId: number) {
    try {
        // Find most recent session without logout timestamp
        const { data: sessions, error: findError } = await supabase
            .from('UserSession')
            .select('session_id')
            .eq('user_id', userId)
            .is('logout_at', null) // Only active sessions
            .order('login_at', { ascending: false }) // Most recent first
            .limit(1);

        if (findError) throw findError;

        // Update logout timestamp if active session found
        if (sessions && sessions.length > 0) {
            const { error: updateError } = await supabase
                .from('UserSession')
                .update({ logout_at: new Date().toISOString() })
                .eq('session_id', sessions[0].session_id);

            if (updateError) throw updateError;
        }
        // If no active session found, do nothing (user wasn't logged in)
    } catch (error: unknown) {
        console.error('Error closing user session:', error);
        throw new Error('Failed to close session');
    }
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Gets count of currently active sessions
 * 
 * Counts sessions that:
 * 1. Have no logout_at (still logged in)
 * 2. Started within the last 30 minutes (recent activity)
 * 
 * Returns 0 on errors to avoid breaking analytics dashboards.
 * 
 * @returns Number of active sessions (0 on error)
 */
export async function getActiveSessionsCount(): Promise<number> {
    try {
        // Calculate cutoff time (30 minutes ago)
        const cutoffTime = new Date(Date.now() - ACTIVE_SESSION_WINDOW_MINUTES * 60 * 1000);

        // Count sessions that are active and recent
        const { data, error } = await supabase
            .from('UserSession')
            .select('user_id', { count: 'exact', head: true })
            .is('logout_at', null) // No logout = still active
            .gte('login_at', cutoffTime.toISOString()); // Recent login

        if (error) throw error;

        return data?.length || 0;
    } catch (error: unknown) {
        console.error('Error getting active sessions:', error);
        return 0; // Fail-safe: return 0 instead of throwing
    }
}

/**
 * Gets Daily Active Users (DAU) count
 * 
 * Counts unique users who logged in at least once today (since midnight).
 * Uses Set to deduplicate users who logged in multiple times.
 * 
 * Returns 0 on errors to avoid breaking analytics dashboards.
 * 
 * @returns Number of unique users active today (0 on error)
 */
export async function getDailyActiveUsers(): Promise<number> {
    try {
        // Get start of today (midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch all sessions since midnight
        const { data, error } = await supabase
            .from('UserSession')
            .select('user_id')
            .gte('login_at', today.toISOString());

        if (error) throw error;

        // Count unique users (deduplicate multiple sessions)
        const uniqueUsers = new Set(data?.map(s => s.user_id) || []);
        return uniqueUsers.size;
    } catch (error: unknown) {
        console.error('Error getting daily active users:', error);
        return 0; // Fail-safe: return 0 instead of throwing
    }
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: Login flow
 * 
 * // After successful authentication
 * export async function loginUser(email: string, password: string) {
 *   const user = await authenticateUser(email, password);
 *   
 *   // Record session start
 *   await createUserSession(user.user_id);
 *   
 *   return { token: generateToken(user), user };
 * }
 * 
 * EXAMPLE 2: Logout flow
 * 
 * // When user logs out
 * export async function logoutUser(userId: number) {
 *   // Close active session
 *   await closeUserSession(userId);
 *   
 *   // Clear tokens, cookies, etc.
 *   return { success: true };
 * }
 * 
 * EXAMPLE 3: Analytics dashboard
 * 
 * export async function getSystemMetrics() {
 *   const [activeSessions, dailyUsers] = await Promise.all([
 *     getActiveSessionsCount(),
 *     getDailyActiveUsers()
 *   ]);
 *   
 *   return {
 *     currentlyActive: activeSessions,
 *     dailyActiveUsers: dailyUsers,
 *     timestamp: new Date()
 *   };
 * }
 * 
 * EXAMPLE 4: Monitor user engagement
 * 
 * // Get user's session history
 * const { data: sessions } = await supabase
 *   .from('UserSession')
 *   .select('login_at, logout_at')
 *   .eq('user_id', userId)
 *   .order('login_at', { ascending: false })
 *   .limit(10);
 * 
 * // Calculate average session duration
 * const durations = sessions
 *   .filter(s => s.logout_at) // Only completed sessions
 *   .map(s => new Date(s.logout_at) - new Date(s.login_at));
 * const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
 * 
 * NOTES:
 * 
 * - Active sessions: Sessions without logout_at within 30 minutes
 * - DAU: Counts unique users, not total logins
 * - Multiple logins by same user = 1 DAU but multiple sessions
 * - Analytics functions return 0 on errors for dashboard stability
 * - Session cleanup: Consider cron job to close abandoned sessions
 */