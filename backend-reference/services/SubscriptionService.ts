/**
 * Subscription Service
 * 
 * Handles all subscription-related business logic for the application.
 * Manages subscription lifecycle including:
 * - Creating new subscriptions with validation
 * - Retrieving user subscriptions with free plan fallback
 * - Updating existing subscriptions
 * - Managing active subscription states
 * - Providing free plan defaults for users without subscriptions
 * 
 * Uses Supabase for database operations with email normalization.
 */

import {
    createSubscription,
    findSubscriptionById,
    findSubscriptionsByEmail,
    findActiveSubscriptionByEmail,
    updateSubscription
} from '../utils/supabaseUtils/SubscriptionUtils';

import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto/Subscription';
import { 
    SubscriptionData,
    CreateSubscriptionRequest 
} from '../entities/subscription/SubscriptionData';

// ============================================================================
// Type Definitions
// ============================================================================

// Note: Using CreateSubscriptionRequest from SubscriptionData.ts
// No additional type definitions needed

// ============================================================================
// Constants
// ============================================================================

/**
 * Default free plan subscription data returned when user has no active subscription
 * Uses readonly to prevent accidental mutation of default values
 */
const FREE_PLAN_SUBSCRIPTION: Readonly<Omit<SubscriptionData, 'email'>> = {
    subscriptionId: "",
    planId: 'free',
    status: 'active',
    startDate: "",
    renewalDate: null,
    expiresAt: null,
    autoRenew: false,
    updatedAt: ""
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps database subscription record to domain SubscriptionData entity
 * 
 * Transforms snake_case database fields to camelCase domain properties
 * for consistent API responses.
 * 
 * @param subscription - Raw subscription record from database
 * @returns Normalized SubscriptionData object
 */
function mapToSubscriptionData(subscription: {
    subscription_ID: string;
    email: string;
    plan_ID: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    start_date: string;
    renewal_date: string | null;
    expires_at: string | null;
    auto_renew: boolean;
    updated_at: string;
}): SubscriptionData {
    return {
        subscriptionId: subscription.subscription_ID,
        email: subscription.email,
        planId: subscription.plan_ID,
        status: subscription.status,
        startDate: subscription.start_date,
        renewalDate: subscription.renewal_date,
        expiresAt: subscription.expires_at,
        autoRenew: subscription.auto_renew,
        updatedAt: subscription.updated_at
    };
}

/**
 * Creates a free plan subscription data object for users without active subscriptions
 * 
 * Used as fallback when user has no subscription record in database.
 * Ensures all users have at least free tier access.
 * 
 * @param email - User's email address (will be normalized to lowercase)
 * @returns SubscriptionData representing a free plan
 */
function createFreePlanSubscription(email: string): SubscriptionData {
    return {
        ...FREE_PLAN_SUBSCRIPTION,
        email: normalizeEmail(email)
    };
}

/**
 * Normalizes email address to lowercase for consistent storage and comparison
 * 
 * Email addresses are case-insensitive per RFC 5321, so we normalize
 * to lowercase to prevent duplicate accounts and simplify lookups.
 * Also trims whitespace to handle user input errors.
 * 
 * @param email - Raw email address
 * @returns Lowercase normalized email with trimmed whitespace
 */
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

/**
 * Finds the most relevant subscription from a list
 * 
 * Priority order:
 * 1. Active subscriptions (status === 'active')
 * 2. Most recently updated subscription
 * 
 * This ensures users see their active subscription first,
 * or their most recent subscription if none are active.
 * 
 * @param subscriptions - Array of user subscriptions
 * @returns The most relevant subscription
 */
function findMostRelevantSubscription(subscriptions: Array<{
    subscription_ID: string;
    email: string;
    plan_ID: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    start_date: string;
    renewal_date: string | null;
    expires_at: string | null;
    auto_renew: boolean;
    updated_at: string;
}>): typeof subscriptions[0] {
    // Prioritize active subscriptions
    const activeSubscription = subscriptions.find(sub => sub.status === 'active');
    
    if (activeSubscription) {
        return activeSubscription;
    }

    // Fall back to most recently updated subscription
    return subscriptions.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.start_date).getTime();
        const dateB = new Date(b.updated_at || b.start_date).getTime();
        return dateB - dateA;
    })[0];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Creates a new subscription or updates an existing active subscription for a user
 * 
 * Business Logic:
 * - Normalizes email to lowercase for consistency
 * - Checks if user has an existing active subscription
 * - If active subscription exists: updates it with new data
 * - If no active subscription: creates new subscription record
 * - Auto-renew defaults to true if not specified
 * - Status defaults to 'active' if not specified
 * 
 * This upsert pattern ensures users never have multiple active subscriptions
 * and allows seamless plan upgrades/downgrades.
 * 
 * @param subscriptionData - Subscription details to create or update
 * @returns Promise resolving to the created or updated SubscriptionData
 * @throws Error if subscription creation/update fails or if unable to retrieve result
 */
export async function createOrUpdateSubscription(
    subscriptionData: CreateSubscriptionRequest
): Promise<SubscriptionData> {
    try {
        const normalizedEmail = normalizeEmail(subscriptionData.email);

        // Check if user already has an active subscription
        const existingSubscription = await findActiveSubscriptionByEmail(normalizedEmail);

        if (existingSubscription) {
            // UPDATE PATH: User has an active subscription
            console.log(`Updating existing subscription for email: ${normalizedEmail}`);

            // Build update DTO with new subscription data
            const updateDto: UpdateSubscriptionDto = {
                subscription_ID: subscriptionData.subscriptionId,
                plan_ID: subscriptionData.planId,
                status: subscriptionData.status || 'active',
                renewal_date: subscriptionData.renewalDate || null,
                expires_at: subscriptionData.expiresAt || null,
                auto_renew: subscriptionData.autoRenew ?? true // Default to true if not specified
            };

            // Perform update operation
            await updateSubscription(existingSubscription.subscription_ID, updateDto);

            // Fetch the updated record to return fresh data
            const updatedSubscription = await findSubscriptionById(existingSubscription.subscription_ID);

            if (!updatedSubscription) {
                throw new Error(`Failed to retrieve updated subscription: ${existingSubscription.subscription_ID}`);
            }

            return mapToSubscriptionData(updatedSubscription);
        } else {
            // CREATE PATH: No active subscription exists
            console.log(`Creating new subscription for email: ${normalizedEmail}`);

            // Build create DTO with all required fields
            const createDto: CreateSubscriptionDto = {
                subscription_ID: subscriptionData.subscriptionId,
                email: normalizedEmail,
                plan_ID: subscriptionData.planId,
                status: subscriptionData.status || 'active',
                start_date: subscriptionData.startDate || new Date().toISOString(), // Default to now
                renewal_date: subscriptionData.renewalDate || null,
                expires_at: subscriptionData.expiresAt || null,
                auto_renew: subscriptionData.autoRenew ?? true // Default to true if not specified
            };

            // Create new subscription record
            const newSubscription = await createSubscription(createDto);
            
            // Fetch created record to ensure we have all fields
            const subscription = await findSubscriptionById(newSubscription.subscription_ID);

            if (!subscription) {
                throw new Error(`Failed to retrieve created subscription: ${newSubscription.subscription_ID}`);
            }

            return mapToSubscriptionData(subscription);
        }
    } catch (error: unknown) {
        console.error('Error creating/updating subscription:', error);
        throw error;
    }
}

/**
 * Retrieves a subscription by its unique ID
 * 
 * Direct lookup by subscription ID without email filtering.
 * Returns null if subscription not found.
 * 
 * @param subscriptionId - Unique subscription identifier
 * @returns Promise resolving to SubscriptionData or null if not found
 * @throws Error if database operation fails
 */
export async function getSubscriptionById(subscriptionId: string): Promise<SubscriptionData | null> {
    try {
        const subscription = await findSubscriptionById(subscriptionId);
        
        if (!subscription) {
            return null;
        }

        return mapToSubscriptionData(subscription);
    } catch (error: unknown) {
        console.error('Error getting subscription:', error);
        throw error;
    }
}

/**
 * Gets the primary subscription for a user by email
 * 
 * Process:
 * 1. Normalizes email to lowercase
 * 2. Fetches all subscriptions for the email
 * 3. If no subscriptions exist, returns free plan default
 * 4. Prioritizes active subscriptions
 * 5. Falls back to most recent subscription if no active ones
 * 
 * This ensures every user always has a subscription (free plan minimum).
 * 
 * @param email - User's email address
 * @returns Promise resolving to user's primary SubscriptionData
 * @throws Error if database operation fails
 */
export async function getUserSubscription(email: string): Promise<SubscriptionData> {
    try {
        const normalizedEmail = normalizeEmail(email);
        const subscriptions = await findSubscriptionsByEmail(normalizedEmail);

        // Check if user has any subscriptions
        if (!subscriptions || subscriptions.length === 0) {
            // Return free plan with default data if no subscription exists
            console.log(`No subscription found for ${normalizedEmail}, returning free plan`);
            return createFreePlanSubscription(normalizedEmail);
        }

        // Find the most relevant subscription (active first, then most recent)
        const subscription = findMostRelevantSubscription(subscriptions);

        return mapToSubscriptionData(subscription);
    } catch (error: unknown) {
        console.error('Error getting user subscription:', error);
        throw error;

        // NOTE: Commented out fallback to free plan on error
        // Consider whether errors should return free plan or propagate
        // Current behavior: throws error to caller for proper error handling
        
        // return createFreePlanSubscription(email.toLowerCase());
    }
}

/**
 * Gets the active subscription for a user if one exists
 * 
 * Only returns subscriptions with status === 'active'.
 * Returns null if user has no active subscription.
 * 
 * Use this when you need to verify a user has paid access,
 * as opposed to getUserSubscription which falls back to free plan.
 * 
 * @param email - User's email address
 * @returns Promise resolving to active SubscriptionData or null
 * @throws Error if database operation fails
 */
export async function getActiveUserSubscription(email: string): Promise<SubscriptionData | null> {
    try {
        const normalizedEmail = normalizeEmail(email);
        const subscription = await findActiveSubscriptionByEmail(normalizedEmail);
        
        if (!subscription) {
            return null;
        }

        return mapToSubscriptionData(subscription);
    } catch (error: unknown) {
        console.error('Error getting active subscription:', error);
        throw error;
    }
}