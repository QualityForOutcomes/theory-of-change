/**
 * Subscription Service Tests
 *
 * Focuses on business logic, error handling, and plan prioritization.
 * Mocks all dependencies on Supabase utility functions.
 */

// --- MOCK DEPENDENCIES ---
const mockCreateSubscription = jest.fn();
const mockFindSubscriptionById = jest.fn();
const mockFindSubscriptionsByEmail = jest.fn();
const mockFindActiveSubscriptionByEmail = jest.fn();
const mockUpdateSubscription = jest.fn();

// Mock SubscriptionUtils
jest.mock('../../utils/supabaseUtils/SubscriptionUtils', () => ({
    createSubscription: mockCreateSubscription,
    findSubscriptionById: mockFindSubscriptionById,
    findSubscriptionsByEmail: mockFindSubscriptionsByEmail,
    findActiveSubscriptionByEmail: mockFindActiveSubscriptionByEmail,
    updateSubscription: mockUpdateSubscription,
}));

// Import the module to be tested
const subscriptionService = require('../../services/SubscriptionService');

// --- MOCK DATA ---

const TEST_EMAIL = 'Test.User@example.com';
const NORM_EMAIL = 'test.user@example.com';
const MOCK_SUB_ID = 'sub_pro_123';
const MOCK_START_DATE = new Date('2024-01-01T00:00:00.000Z').toISOString();
const MOCK_RENEWAL_DATE = new Date('2025-01-01T00:00:00.000Z').toISOString();

const MOCK_DB_SUBSCRIPTION = {
    subscription_ID: MOCK_SUB_ID,
    email: NORM_EMAIL,
    plan_ID: 'pro',
    status: 'active',
    start_date: MOCK_START_DATE,
    renewal_date: MOCK_RENEWAL_DATE,
    expires_at: null,
    auto_renew: true,
    updated_at: MOCK_START_DATE,
};

const MOCK_DOMAIN_SUBSCRIPTION = {
    subscriptionId: MOCK_SUB_ID,
    email: NORM_EMAIL,
    planId: 'pro',
    status: 'active',
    startDate: MOCK_START_DATE,
    renewalDate: MOCK_RENEWAL_DATE,
    expiresAt: null,
    autoRenew: true,
    updatedAt: MOCK_START_DATE,
};

const FREE_PLAN_SUBSCRIPTION = {
    subscriptionId: "",
    planId: 'free',
    status: 'active',
    startDate: "",
    renewalDate: null,
    expiresAt: null,
    autoRenew: false,
    updatedAt: "",
    email: NORM_EMAIL
};

describe('SubscriptionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // getSubscriptionById
    // =========================================================================

    describe('getSubscriptionById', () => {
        it('should retrieve and map a subscription by ID successfully', async () => {
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            const result = await subscriptionService.getSubscriptionById(MOCK_SUB_ID);

            expect(mockFindSubscriptionById).toHaveBeenCalledWith(MOCK_SUB_ID);
            expect(result).toEqual(MOCK_DOMAIN_SUBSCRIPTION);
        });

        it('should return null if no subscription is found by ID', async () => {
            mockFindSubscriptionById.mockResolvedValue(null);

            const result = await subscriptionService.getSubscriptionById('nonexistent_id');

            expect(mockFindSubscriptionById).toHaveBeenCalledWith('nonexistent_id');
            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // getUserSubscription
    // =========================================================================

    describe('getUserSubscription', () => {
        it('should return the active subscription when multiple exist', async () => {
            const cancelledSub = { ...MOCK_DB_SUBSCRIPTION, status: 'cancelled', plan_ID: 'basic', updated_at: '2023-05-01T00:00:00.000Z' };
            const activeSub = { ...MOCK_DB_SUBSCRIPTION, status: 'active', plan_ID: 'pro', updated_at: '2023-10-01T00:00:00.000Z' };

            // Mock to return both subscriptions
            mockFindSubscriptionsByEmail.mockResolvedValue([cancelledSub, activeSub]);

            const result = await subscriptionService.getUserSubscription(TEST_EMAIL);

            // Assertions: It should return the active one due to prioritization logic
            expect(mockFindSubscriptionsByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(result).toEqual(mapToDomain(activeSub));
        });

        it('should return the most recently updated subscription if no subscription is active', async () => {
            const olderSub = { ...MOCK_DB_SUBSCRIPTION, status: 'expired', updated_at: '2023-01-01T00:00:00.000Z' };
            const newerSub = { ...MOCK_DB_SUBSCRIPTION, status: 'pending', updated_at: '2023-12-01T00:00:00.000Z', plan_ID: 'premium' };

            mockFindSubscriptionsByEmail.mockResolvedValue([olderSub, newerSub]);

            const result = await subscriptionService.getUserSubscription(TEST_EMAIL);

            // Assertions: It should return the newer, pending subscription
            expect(result.planId).toBe('premium');
            expect(result.updatedAt).toBe(newerSub.updated_at);
        });

        it('should return FREE_PLAN_SUBSCRIPTION if no subscriptions are found', async () => {
            mockFindSubscriptionsByEmail.mockResolvedValue([]);

            const result = await subscriptionService.getUserSubscription(TEST_EMAIL);

            expect(mockFindSubscriptionsByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(result).toEqual(FREE_PLAN_SUBSCRIPTION);
        });
    });

    // =========================================================================
    // getActiveUserSubscription
    // =========================================================================

    describe('getActiveUserSubscription', () => {
        it('should return the active subscription when one is found', async () => {
            mockFindActiveSubscriptionByEmail.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            const result = await subscriptionService.getActiveUserSubscription(TEST_EMAIL);

            expect(mockFindActiveSubscriptionByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(result).toEqual(MOCK_DOMAIN_SUBSCRIPTION);
        });

        it('should return null if no active subscription is found', async () => {
            mockFindActiveSubscriptionByEmail.mockResolvedValue(null);

            const result = await subscriptionService.getActiveUserSubscription(TEST_EMAIL);

            expect(mockFindActiveSubscriptionByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(result).toBeNull();
        });
    });
});

/**
 * Helper function used internally by tests to match domain mapping logic
 * Note: This is a re-implementation of the private mapToSubscriptionData for testing purposes
 */
function mapToDomain(subscription: { status: any; plan_ID: any; updated_at: any; subscription_ID: any; email: any; start_date: any; renewal_date: any; expires_at: any; auto_renew: any; }) {
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
