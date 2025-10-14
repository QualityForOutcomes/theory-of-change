/**
 * Subscription and Invoice Utilities
 * 
 * Database operations for subscription and invoice management using Supabase.
 * Handles CRUD operations for subscription lifecycle and billing records.
 * 
 * Tables:
 * - Subscription: User subscriptions (plan, status, dates)
 * - Invoice: Billing records for subscriptions
 * 
 * Subscription Statuses:
 * - active: Currently active subscription
 * - cancelled: User cancelled, may still have access until expiry
 * - expired: Subscription period ended
 * - pending: Payment processing or awaiting activation
 */

import { createClient } from '@supabase/supabase-js';
import {
    Subscription,
    CreateSubscriptionDto,
    UpdateSubscriptionDto
} from '../../dto/Subscription';
import {
    Invoice,
    CreateInvoiceDto,
    UpdateInvoiceDto
} from '../../dto/Invoice';

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
const NOT_FOUND_CODE = 'PGRST116';

// ============================================================================
// Subscription Operations
// ============================================================================

/**
 * Creates a new subscription record
 * 
 * Inserts a new subscription with the provided details.
 * Sets updated_at to current timestamp automatically.
 * Auto-renew defaults to true if not specified.
 * 
 * @param subscriptionData - Subscription creation data
 * @returns Created subscription record
 * @throws Error with Supabase error details if creation fails
 */
export async function createSubscription(subscriptionData: CreateSubscriptionDto): Promise<Subscription> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .insert({
                subscription_ID: subscriptionData.subscription_ID,
                email: subscriptionData.email,
                plan_ID: subscriptionData.plan_ID,
                status: subscriptionData.status,
                start_date: subscriptionData.start_date || new Date().toISOString(),
                renewal_date: subscriptionData.renewal_date,
                expires_at: subscriptionData.expires_at,
                auto_renew: subscriptionData.auto_renew ?? true,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            // Preserve original error with all Supabase details
            console.error('Supabase error creating subscription:', error);

            // Create detailed error object with Supabase metadata
            const detailedError: any = new Error(error.message || 'Failed to create subscription');
            detailedError.code = error.code;
            detailedError.details = error.details;
            detailedError.hint = error.hint;

            throw detailedError;
        }

        return data;
    } catch (error: unknown) {
        // Re-throw error without modification to preserve details
        throw error;
    }
}

/**
 * Finds a subscription by its unique ID
 * 
 * @param subscriptionId - Unique subscription identifier
 * @returns Subscription if found, null if not found
 * @throws Error if database operation fails
 */
export async function findSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .select('*')
            .eq('subscription_ID', subscriptionId)
            .single();

        // Handle "not found" gracefully
        if (error) {
            if (error.code === NOT_FOUND_CODE) {
                return null; // Subscription doesn't exist
            }
            throw error;
        }

        return data;
    } catch (error: unknown) {
        console.error('Error finding subscription:', error);
        throw new Error('Failed to find subscription');
    }
}

/**
 * Finds all subscriptions for a user by email
 * 
 * Returns all subscriptions (active, cancelled, expired) for the user.
 * Sorted by start date (newest first).
 * 
 * @param email - User's email address
 * @returns Array of subscriptions (empty array if none found)
 * @throws Error if database operation fails
 */
export async function findSubscriptionsByEmail(email: string): Promise<Subscription[]> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .select('*')
            .eq('email', email)
            .order('start_date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error: unknown) {
        console.error('Error finding subscriptions by email:', error);
        throw new Error('Failed to find subscriptions');
    }
}

/**
 * Finds active subscription for a user
 * 
 * Returns only the active subscription for the user.
 * Users should typically have only one active subscription at a time.
 * 
 * @param email - User's email address
 * @returns Active subscription if found, null if no active subscription
 * @throws Error if database operation fails
 */
export async function findActiveSubscriptionByEmail(email: string): Promise<Subscription | null> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .select('*')
            .eq('email', email)
            .eq('status', 'active')
            .single();

        // Handle "not found" gracefully
        if (error) {
            if (error.code === NOT_FOUND_CODE) {
                return null; // No active subscription
            }
            throw error;
        }

        return data;
    } catch (error: unknown) {
        console.error('Error finding active subscription:', error);
        throw new Error('Failed to find active subscription');
    }
}

/**
 * Updates subscription details
 * 
 * Updates only the fields provided in the updates object.
 * Automatically updates the updated_at timestamp.
 * 
 * @param subscriptionId - Subscription ID to update
 * @param updates - Fields to update (partial update)
 * @returns Updated subscription record
 * @throws Error if database operation fails
 */
export async function updateSubscription(
    subscriptionId: string,
    updates: UpdateSubscriptionDto
): Promise<Subscription> {
    try {
        // Build update object with only provided fields
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        // Only include fields that are explicitly provided
        if (updates.subscription_ID !== undefined) updateData.subscription_ID = updates.subscription_ID;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.plan_ID !== undefined) updateData.plan_ID = updates.plan_ID;
        if (updates.renewal_date !== undefined) updateData.renewal_date = updates.renewal_date;
        if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;
        if (updates.auto_renew !== undefined) updateData.auto_renew = updates.auto_renew;

        const { data, error } = await supabase
            .from('Subscription')
            .update(updateData)
            .eq('subscription_ID', subscriptionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error updating subscription:', error);
        throw new Error('Failed to update subscription');
    }
}

export async function updateSubscriptionByEmail(
    email: string,
    updates: UpdateSubscriptionDto
): Promise<Subscription> {
    try {
        // Build update object with only provided fields
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        // Only include fields that are explicitly provided
        if (updates.subscription_ID !== undefined) updateData.subscription_ID = updates.subscription_ID;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.plan_ID !== undefined) updateData.plan_ID = updates.plan_ID;
        if (updates.renewal_date !== undefined) updateData.renewal_date = updates.renewal_date;
        if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;
        if (updates.auto_renew !== undefined) updateData.auto_renew = updates.auto_renew;

        const { data, error } = await supabase
            .from('Subscription')
            .update(updateData)
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error updating subscription:', error);
        throw new Error('Failed to update subscription');
    }
}

/**
 * Cancels a subscription
 * 
 * Sets status to 'cancelled' and disables auto-renewal.
 * Does not delete the subscription - keeps it for history.
 * User may still have access until expires_at date.
 * 
 * @param subscriptionId - Subscription ID to cancel
 * @returns Cancelled subscription record
 * @throws Error if database operation fails
 */
export async function cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .update({
                status: 'cancelled',
                auto_renew: false,
                updated_at: new Date().toISOString()
            })
            .eq('subscription_ID', subscriptionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error cancelling subscription:', error);
        throw new Error('Failed to cancel subscription');
    }
}

export async function cancelSubscriptionByEmail(email: string): Promise<Subscription> {
    try {
        const { data, error } = await supabase
            .from('Subscription')
            .update({
                status: 'cancelled',
                auto_renew: false,
                updated_at: new Date().toISOString()
            })
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error cancelling subscription:', error);
        throw new Error('Failed to cancel subscription');
    }
}

/**
 * Permanently deletes a subscription
 * 
 * Removes subscription from database completely.
 * Use with caution - prefer cancelling instead for audit trail.
 * 
 * @param subscriptionId - Subscription ID to delete
 * @throws Error if database operation fails
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('Subscription')
            .delete()
            .eq('subscription_ID', subscriptionId);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting subscription:', error);
        throw new Error('Failed to delete subscription');
    }
}

// ============================================================================
// Invoice Operations
// ============================================================================

/**
 * Creates a new invoice record
 * 
 * Generates invoice for a subscription period.
 * Amount is stored in cents to avoid floating point issues.
 * Issued_at defaults to current timestamp if not provided.
 * 
 * @param invoiceData - Invoice creation data
 * @returns Created invoice record
 * @throws Error if database operation fails
 */
export async function createInvoice(invoiceData: CreateInvoiceDto): Promise<Invoice> {
    try {
        const { data, error } = await supabase
            .from('Invoice')
            .insert({
                subscription_ID: invoiceData.subscription_ID,
                email: invoiceData.email,
                amount_cents: invoiceData.amount_cents,
                currency: invoiceData.currency,
                period_start: invoiceData.period_start,
                period_end: invoiceData.period_end,
                issued_at: invoiceData.issued_at || new Date().toISOString(),
                due_at: invoiceData.due_at,
                status: invoiceData.status,
                pdf_url: invoiceData.pdf_url,
                is_public: invoiceData.is_public ?? false
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error creating invoice:', error);
        throw new Error('Failed to create invoice');
    }
}

/**
 * Finds an invoice by its unique ID
 * 
 * @param invoiceId - Unique invoice identifier
 * @returns Invoice if found, null if not found
 * @throws Error if database operation fails
 */
export async function findInvoiceById(invoiceId: number): Promise<Invoice | null> {
    try {
        const { data, error } = await supabase
            .from('Invoice')
            .select('*')
            .eq('invoice_ID', invoiceId)
            .single();

        // Handle "not found" gracefully
        if (error) {
            if (error.code === NOT_FOUND_CODE) {
                return null; // Invoice doesn't exist
            }
            throw error;
        }

        return data;
    } catch (error: unknown) {
        console.error('Error finding invoice:', error);
        throw new Error('Failed to find invoice');
    }
}

/**
 * Finds all invoices for a user by email
 * 
 * Returns all invoices for the user across all subscriptions.
 * Sorted by issue date (newest first).
 * 
 * @param email - User's email address
 * @returns Array of invoices (empty array if none found)
 * @throws Error if database operation fails
 */
export async function findInvoicesByEmail(email: string): Promise<Invoice[]> {
    try {
        const { data, error } = await supabase
            .from('Invoice')
            .select('*')
            .eq('email', email)
            .order('issued_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error: unknown) {
        console.error('Error finding invoices by email:', error);
        throw new Error('Failed to find invoices');
    }
}

/**
 * Finds all invoices for a specific subscription
 * 
 * Returns billing history for a single subscription.
 * Sorted by issue date (newest first).
 * 
 * @param subscriptionId - Subscription identifier
 * @returns Array of invoices (empty array if none found)
 * @throws Error if database operation fails
 */
export async function findInvoicesBySubscription(subscriptionId: string): Promise<Invoice[]> {
    try {
        const { data, error } = await supabase
            .from('Invoice')
            .select('*')
            .eq('subscription_ID', subscriptionId)
            .order('issued_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error: unknown) {
        console.error('Error finding invoices by subscription:', error);
        throw new Error('Failed to find invoices');
    }
}

/**
 * Updates invoice details
 * 
 * Updates only the fields provided (status, PDF URL, public flag).
 * Typically used to update payment status or add generated PDF.
 * 
 * @param invoiceId - Invoice ID to update
 * @param updates - Fields to update (partial update)
 * @returns Updated invoice record
 * @throws Error if database operation fails
 */
export async function updateInvoice(
    invoiceId: number,
    updates: UpdateInvoiceDto
): Promise<Invoice> {
    try {
        // Build update object with only provided fields
        const updateData: any = {};
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.pdf_url !== undefined) updateData.pdf_url = updates.pdf_url;
        if (updates.is_public !== undefined) updateData.is_public = updates.is_public;

        const { data, error } = await supabase
            .from('Invoice')
            .update(updateData)
            .eq('invoice_ID', invoiceId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        console.error('Error updating invoice:', error);
        throw new Error('Failed to update invoice');
    }
}

/**
 * Permanently deletes an invoice
 * 
 * Removes invoice from database completely.
 * Use with caution - consider keeping for audit/tax records.
 * 
 * @param invoiceId - Invoice ID to delete
 * @throws Error if database operation fails
 */
export async function deleteInvoice(invoiceId: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('Invoice')
            .delete()
            .eq('invoice_ID', invoiceId);

        if (error) throw error;
    } catch (error: unknown) {
        console.error('Error deleting invoice:', error);
        throw new Error('Failed to delete invoice');
    }
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: Create subscription with trial
 * 
 * const subscription = await createSubscription({
 *   subscription_ID: 'sub_123',
 *   email: 'user@example.com',
 *   plan_ID: 'plan_pro',
 *   status: 'active',
 *   start_date: new Date().toISOString(),
 *   renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
 *   expires_at: null, // No expiry for active subscriptions
 *   auto_renew: true
 * });
 * 
 * EXAMPLE 2: Check user's active subscription
 * 
 * const activeSubscription = await findActiveSubscriptionByEmail('user@example.com');
 * if (!activeSubscription) {
 *   return res.status(403).json({ error: 'No active subscription' });
 * }
 * 
 * EXAMPLE 3: Cancel subscription (keep until period end)
 * 
 * const cancelled = await cancelSubscription('sub_123');
 * // User retains access until expires_at date
 * 
 * EXAMPLE 4: Generate monthly invoice
 * 
 * const invoice = await createInvoice({
 *   subscription_ID: 'sub_123',
 *   email: 'user@example.com',
 *   amount_cents: 2999, // $29.99
 *   currency: 'USD',
 *   period_start: '2025-01-01T00:00:00Z',
 *   period_end: '2025-02-01T00:00:00Z',
 *   due_at: '2025-01-15T00:00:00Z',
 *   status: 'paid',
 *   pdf_url: null,
 *   is_public: false
 * });
 * 
 * EXAMPLE 5: Get billing history
 * 
 * const userInvoices = await findInvoicesByEmail('user@example.com');
 * const totalSpent = userInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0);
 * console.log(`User has spent $${totalSpent / 100}`);
 */