/**
 * Subscription Service Create & List Tests
 *
 * Extends coverage for createOrUpdateSubscription and getAllUserSubscriptions.
 */

// --- MOCK DEPENDENCIES ---
const mockCreateSubscription = jest.fn();
const mockFindSubscriptionById = jest.fn();
const mockFindSubscriptionsByEmail = jest.fn();

jest.mock('../../utils/supabaseUtils/SubscriptionUtils', () => ({
    createSubscription: mockCreateSubscription,
    findSubscriptionById: mockFindSubscriptionById,
    findSubscriptionsByEmail: mockFindSubscriptionsByEmail,
    // Other functions not used here are omitted
}));

const SubscriptionService = require('../../services/SubscriptionService');

// --- MOCK DATA ---
const TEST_EMAIL = 'User.Name@Example.com';
const NORM_EMAIL = 'user.name@example.com';

const MOCK_SUB_ID = 'sub_basic_001';
const MOCK_DB_SUBSCRIPTION = {
    subscription_ID: MOCK_SUB_ID,
    email: NORM_EMAIL,
    plan_ID: 'basic',
    status: 'active',
    start_date: '2024-02-01T00:00:00.000Z',
    renewal_date: '2024-03-01T00:00:00.000Z',
    expires_at: null,
    auto_renew: true,
    updated_at: '2024-02-01T00:00:00.000Z',
};

const mapToDomain = (sub) => ({
    subscriptionId: sub.subscription_ID,
    email: sub.email,
    planId: sub.plan_ID,
    status: sub.status,
    startDate: sub.start_date,
    renewalDate: sub.renewal_date,
    expiresAt: sub.expires_at,
    autoRenew: sub.auto_renew,
    updatedAt: sub.updated_at,
});

describe('SubscriptionService create & list', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrUpdateSubscription (create path)', () => {
        it('creates subscription and returns mapped result', async () => {
            mockCreateSubscription.mockResolvedValue({ subscription_ID: MOCK_SUB_ID });
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            const input = {
                subscriptionId: MOCK_SUB_ID,
                email: TEST_EMAIL,
                planId: 'basic',
                status: 'active',
                startDate: '2024-02-01T00:00:00.000Z',
                renewalDate: '2024-03-01T00:00:00.000Z',
                autoRenew: true,
                expiresAt: null,
            };

            const result = await SubscriptionService.createOrUpdateSubscription(input);

            expect(mockCreateSubscription).toHaveBeenCalledWith(expect.objectContaining({
                subscription_ID: MOCK_SUB_ID,
                email: NORM_EMAIL,
                plan_ID: 'basic',
            }));
            expect(mockFindSubscriptionById).toHaveBeenCalledWith(MOCK_SUB_ID);
            expect(result).toEqual(mapToDomain(MOCK_DB_SUBSCRIPTION));
        });

        it('applies defaults for status, autoRenew, and startDate when missing', async () => {
            mockCreateSubscription.mockResolvedValue({ subscription_ID: MOCK_SUB_ID });
            mockFindSubscriptionById.mockResolvedValue(MOCK_DB_SUBSCRIPTION);

            const input = {
                subscriptionId: MOCK_SUB_ID,
                email: TEST_EMAIL,
                planId: 'basic',
                // status omitted
                // startDate omitted
                // autoRenew omitted
                renewalDate: null,
                expiresAt: null,
            } as any;

            await SubscriptionService.createOrUpdateSubscription(input);

            const createArg = mockCreateSubscription.mock.calls[0][0];
            expect(createArg.status).toBe('active');
            expect(createArg.auto_renew).toBe(true);
            expect(typeof createArg.start_date).toBe('string');
            expect(createArg.email).toBe(NORM_EMAIL);
        });

        it('throws error when created subscription cannot be retrieved', async () => {
            mockCreateSubscription.mockResolvedValue({ subscription_ID: MOCK_SUB_ID });
            mockFindSubscriptionById.mockResolvedValue(null);

            await expect(
                SubscriptionService.createOrUpdateSubscription({ subscriptionId: MOCK_SUB_ID, email: TEST_EMAIL, planId: 'basic' })
            ).rejects.toThrow(`Failed to retrieve created subscription: ${MOCK_SUB_ID}`);
        });

        it('propagates error when create operation fails', async () => {
            mockCreateSubscription.mockRejectedValue(new Error('DB_CREATE_ERROR'));

            await expect(
                SubscriptionService.createOrUpdateSubscription({ subscriptionId: MOCK_SUB_ID, email: TEST_EMAIL, planId: 'basic' })
            ).rejects.toThrow('DB_CREATE_ERROR');
        });
    });

    describe('getAllUserSubscriptions', () => {
        it('returns empty array when user has no subscriptions', async () => {
            mockFindSubscriptionsByEmail.mockResolvedValue([]);

            const result = await SubscriptionService.getAllUserSubscriptions(TEST_EMAIL);
            expect(mockFindSubscriptionsByEmail).toHaveBeenCalledWith(NORM_EMAIL);
            expect(result).toEqual([]);
        });

        it('maps subscriptions correctly when found', async () => {
            const otherSub = { ...MOCK_DB_SUBSCRIPTION, subscription_ID: 'sub_other', plan_ID: 'pro', updated_at: '2024-02-15T00:00:00.000Z' };
            mockFindSubscriptionsByEmail.mockResolvedValue([MOCK_DB_SUBSCRIPTION, otherSub]);

            const result = await SubscriptionService.getAllUserSubscriptions(TEST_EMAIL);
            expect(result).toEqual([mapToDomain(MOCK_DB_SUBSCRIPTION), mapToDomain(otherSub)]);
        });
    });
});