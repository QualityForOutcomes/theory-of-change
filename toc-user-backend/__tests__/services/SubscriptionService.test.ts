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

// Mock the User Service dependency for normalizeEmail
const mockNormalizeEmail = jest.fn(email => email.toLowerCase().trim());

function normalizeEmail(email: string) {
    return email.toLowerCase().trim();
}

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

const MOCK_CREATE_REQUEST = {
    email: TEST_EMAIL,
    subscriptionId: MOCK_SUB_ID,
    planId: 'pro',
    startDate: MOCK_START_DATE,
    renewalDate: MOCK_RENEWAL_DATE,
    autoRenew: true
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

describe('SubscriptionService Success Paths', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // createOrUpdateSubscription (Create Path)
    // =========================================================================

    describe('createOrUpdateSubscription - CREATE Path', () => {
        it('should successfully create a new subscription if none is active', async () => {
            // 1. Mock: No active subscription found (triggers CREATE path)
            mockFindActiveSubscriptionByEmail.mockResolvedValue(null);

            // 2. Mock: createSubscription returns the ID of the new subscription
            mockCreateSubscription.mockResolvedValue({ subscription_ID: MOCK_SUB_ID });

            // 3. Mock: findSubscriptionById returns the complete database record
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            const result = await subscriptionService.createOrUpdateSubscription(MOCK_CREATE_REQUEST);

            // Assertions
            expect(mockFindActiveSubscriptionByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(mockCreateSubscription).toHaveBeenCalledWith(expect.objectContaining({
                subscription_ID: MOCK_SUB_ID,
                email: NORM_EMAIL,
                plan_ID: 'pro',
                status: 'active', // Default status applied
                auto_renew: true, // Default autoRenew applied
            }));
            expect(mockFindSubscriptionById).toHaveBeenCalledWith(MOCK_SUB_ID);
            expect(result).toEqual(MOCK_DOMAIN_SUBSCRIPTION);
            expect(mockUpdateSubscription).not.toHaveBeenCalled();
        });

        it('should use current timestamp for startDate if not provided (CREATE)', async () => {
            const requestWithoutDate = { ...MOCK_CREATE_REQUEST, startDate: undefined };

            // Mock setup for successful creation
            mockFindActiveSubscriptionByEmail.mockResolvedValue(null);
            mockCreateSubscription.mockResolvedValue({ subscription_ID: MOCK_SUB_ID });
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION); // Doesn't matter what date this returns, we test input here

            await subscriptionService.createOrUpdateSubscription(requestWithoutDate);

            // Check if startDate was set to a valid ISO string (indicating current date)
            expect(mockCreateSubscription.mock.calls[0][0].start_date).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        });
    });

    // =========================================================================
    // createOrUpdateSubscription (Update Path)
    // =========================================================================

    describe('createOrUpdateSubscription - UPDATE Path', () => {
        it('should successfully update an existing active subscription', async () => {
            // 1. Mock: Active subscription found (triggers UPDATE path)
            const existingActiveSub = { ...MOCK_DB_SUBSCRIPTION, subscription_ID: 'sub_old_111', plan_ID: 'basic' };
            mockFindActiveSubscriptionByEmail.mockResolvedValue(existingActiveSub);

            // 2. Mock: updateSubscription returns void (as is typical for Supabase updates without select)
            mockUpdateSubscription.mockResolvedValue(null);

            // 3. Mock: findSubscriptionById returns the new, updated database record
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            // Request contains the new 'pro' plan
            const result = await subscriptionService.createOrUpdateSubscription(MOCK_CREATE_REQUEST);

            // Assertions
            expect(mockFindActiveSubscriptionByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(mockUpdateSubscription).toHaveBeenCalledWith(
                'sub_old_111', // Should use the ID of the existing subscription
                expect.objectContaining({
                    plan_ID: 'pro',
                    status: 'active',
                    auto_renew: true,
                })
            );
            expect(mockFindSubscriptionById).toHaveBeenCalledWith(existingActiveSub.subscription_ID); // Fetching the updated record
            expect(result).toEqual(MOCK_DOMAIN_SUBSCRIPTION);
            expect(mockCreateSubscription).not.toHaveBeenCalled();
        });
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
