// user.service.test.js

/**
 * Setup:
 * 1. Mock the external Supabase client to control database interactions.
 * 2. Mock all utility functions imported from other files.
 * 3. Mock the password hashing utility.
 */

// Mock Supabase client module
const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase),
}));

// Mock utility functions
const mockFindUserByEmail = jest.fn();
const mockCheckUsernameInDB = jest.fn();
const mockCreateTermsAcceptance = jest.fn();
const mockHasAcceptedTerms = jest.fn();
const mockCreateNewsletterSubscription = jest.fn();
const mockIsSubscribedToNewsletter = jest.fn();
const mockUnsubscribeFromNewsletter = jest.fn();
const mockGetSupabaseUserProfile = jest.fn();
const mockUpdateUserDetails = jest.fn();

jest.mock('../../utils/supabaseUtils/UserUtils', () => ({
    findUserByEmail: mockFindUserByEmail,
    checkUsernameExists: mockCheckUsernameInDB,
    updateUserDetails: mockUpdateUserDetails,
    getUserProfile: mockGetSupabaseUserProfile
}));

jest.mock('../../utils/supabaseUtils/UserTermsUtils', () => ({
    createTermsAcceptance: mockCreateTermsAcceptance,
    hasAcceptedTerms: mockHasAcceptedTerms
}));

jest.mock('../../utils/supabaseUtils/NewsletterUtils', () => ({
    createNewsletterSubscription: mockCreateNewsletterSubscription,
    isSubscribedToNewsletter: mockIsSubscribedToNewsletter,
    unsubscribeFromNewsletter: mockUnsubscribeFromNewsletter,
}));

// Mock ValidationUtils (specifically password hashing)
const mockHashPassword = jest.fn();
jest.mock('../../validators/ValidationUtils', () => ({
    hashPassword: mockHashPassword,
}));

// Import the module to be tested
const userService = require('../../services/UserService');

// Define mock data
const MOCK_USER_DATA = {
    email: 'Test.User@Example.com',
    password: 'securePassword123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    organisation: 'Org',
    acceptTandC: true,
    newsLetterSubs: true
};

const MOCK_USER_DATA_SAME_USERNAME = {
    email: 'Test1.User@Example.com',
    password: 'securePassword123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    organisation: 'Org',
    acceptTandC: true,
    newsLetterSubs: true
};

const MOCK_DB_USER = {
    user_id: 1,
    email: 'test.user@example.com',
    username: 'testuser',
    password_hash: 'hashed_password_abc',
    created_at: new Date('2023-01-01T00:00:00.000Z'),
    user_role: 'user',
    profile: {
        first_name: 'Test',
        last_name: 'User',
        organisation: 'Org',
        avatar_url: 'http://avatar.url/1'
    }
};

const MOCK_USER_RESPONSE = {
    userId: 1,
    email: 'test.user@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    organisation: 'Org',
    avatarUrl: 'http://avatar.url/1',
    displayName: 'Test User',
    createdAt: MOCK_DB_USER.created_at,
    userRole: 'user'
};


describe('UserService', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        // Reset all mock implementations and call histories to avoid cross-test leakage
        mockSupabase.from.mockReset();
        mockSupabase.insert.mockReset();
        mockSupabase.select.mockReset();
        mockSupabase.single.mockReset();

        // Restore default chainable behavior for Supabase query builder
        mockSupabase.from.mockReturnThis();
        mockSupabase.insert.mockReturnThis();
        mockSupabase.select.mockReturnThis();

        jest.clearAllMocks();
        mockHashPassword.mockResolvedValue('hashed_password_abc');

        // Ensure all non-blocking preference utilities resolve successfully by default
        mockCreateTermsAcceptance.mockResolvedValue(null);
        mockCreateNewsletterSubscription.mockResolvedValue(null);
    });

    // Helper to mock the successful user creation flow in Supabase
    const mockSuccessfulSupabaseCreation = () => {
        // Mock User table insert (STEP 2)
        mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
        mockSupabase.select.mockImplementationOnce(() => mockSupabase);
        mockSupabase.single.mockResolvedValueOnce({ data: MOCK_DB_USER, error: null });

        // Mock UserProfile table insert (STEP 3)
        mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
        mockSupabase.select.mockImplementationOnce(() => mockSupabase);
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

        // Mock the final fetch of the complete user (STEP 6: findUserByEmail)
        mockFindUserByEmail.mockResolvedValue(MOCK_DB_USER);
    };

    // =========================================================================
    // checkEmailExists Tests
    // =========================================================================

    describe('checkEmailExists', () => {
        it('should return true if user exists (case-insensitive check)', async () => {
            mockFindUserByEmail.mockResolvedValue(MOCK_DB_USER);
            const exists = await userService.checkEmailExists('Test.User@example.com');
            expect(exists).toBe(true);
            expect(mockFindUserByEmail).toHaveBeenCalledWith('test.user@example.com');
        });

        it('should return false if user does not exist', async () => {
            mockFindUserByEmail.mockResolvedValue(null);
            const exists = await userService.checkEmailExists('nonexistent@example.com');
            expect(exists).toBe(false);
            expect(mockFindUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
        });

        it('should return false on internal database error', async () => {
            mockFindUserByEmail.mockRejectedValue(new Error('DB connection failed'));
            const exists = await userService.checkEmailExists('test@example.com');
            expect(exists).toBe(false);
        });
    });

    // =========================================================================
    // checkUsernameExists Tests
    // =========================================================================

    describe('checkUsernameExists', () => {
        it('should return true if username exists', async () => {
            mockCheckUsernameInDB.mockResolvedValue(true);
            const exists = await userService.checkUsernameExists('takenusername');
            expect(exists).toBe(true);
            expect(mockCheckUsernameInDB).toHaveBeenCalledWith('takenusername');
        });

        it('should return false if username is available', async () => {
            mockCheckUsernameInDB.mockResolvedValue(false);
            const exists = await userService.checkUsernameExists('availableusername');
            expect(exists).toBe(false);
            expect(mockCheckUsernameInDB).toHaveBeenCalledWith('availableusername');
        });

        it('should return false on internal database error', async () => {
            mockCheckUsernameInDB.mockRejectedValue(new Error('DB read error'));
            const exists = await userService.checkUsernameExists('testuser');
            expect(exists).toBe(false);
        });
    });

    // =========================================================================
    // getUserProfile Tests
    // =========================================================================

    describe('getUserProfile', () => {
        it('should return formatted UserResponse when user is found', async () => {
            const mockUserResponseFromUtil = MOCK_USER_RESPONSE;
            mockGetSupabaseUserProfile.mockResolvedValue(mockUserResponseFromUtil);

            const result = await userService.getUserProfile('test.user@example.com');

            expect(result).toEqual(mockUserResponseFromUtil);
            expect(mockGetSupabaseUserProfile).toHaveBeenCalledWith('test.user@example.com');
        });

        it('should return null when user is not found', async () => {
            mockGetSupabaseUserProfile.mockResolvedValue(null);
            const result = await userService.getUserProfile('notfound@example.com');
            expect(result).toBeNull();
        });

        it('should throw a custom error on database failure', async () => {
            mockGetSupabaseUserProfile.mockRejectedValue(new Error('Query failed'));
            await expect(userService.getUserProfile('test@example.com')).rejects.toThrow('Failed to get user profile');
        });
    });

    // =========================================================================
    // createUser Tests
    // =========================================================================

    describe('createUser', () => {

        it('should successfully create a complete user account', async () => {
            mockSuccessfulSupabaseCreation();

            const result = await userService.createUser(MOCK_USER_DATA);

            // Assert user creation
            expect(mockHashPassword).toHaveBeenCalledWith(MOCK_USER_DATA.password);
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: MOCK_USER_DATA.email.toLowerCase(),
                    username: MOCK_USER_DATA.username,
                    password_hash: 'hashed_password_abc',
                })
            );

            // Assert profile creation
            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: MOCK_USER_DATA.email.toLowerCase(),
                    first_name: MOCK_USER_DATA.firstName,
                    last_name: MOCK_USER_DATA.lastName,
                    organisation: MOCK_USER_DATA.organisation,
                })
            );

            // Assert preferences recording (non-blocking)
            expect(mockCreateTermsAcceptance).toHaveBeenCalledWith(MOCK_USER_DATA.email.toLowerCase());
            expect(mockCreateNewsletterSubscription).toHaveBeenCalledWith(MOCK_USER_DATA.email.toLowerCase());

            // Assert final result
            expect(result).toEqual(MOCK_USER_RESPONSE);
        });

        it('throws Email already registered on email unique violation', async () => {
            const uniqueConstraintError = {
                code: '23505',
                message: 'duplicate key value violates unique constraint "User_email_key"'
            };

            mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
            mockSupabase.select.mockImplementationOnce(() => mockSupabase);
            mockSupabase.single.mockResolvedValueOnce({ data: null, error: uniqueConstraintError });

            await expect(userService.createUser(MOCK_USER_DATA)).rejects.toThrow('Email already registered');
        });

        it('throws Username already taken on username unique violation', async () => {
            const usernameConstraintError = {
                code: '23505',
                message: 'duplicate key value violates unique constraint "User_username_key"'
            };

            mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
            mockSupabase.select.mockImplementationOnce(() => mockSupabase);
            mockSupabase.single.mockResolvedValueOnce({ data: null, error: usernameConstraintError });

            await expect(userService.createUser(MOCK_USER_DATA_SAME_USERNAME)).rejects.toThrow('Username already taken');
        });

        it('throws generic error if user creation fails for other reasons', async () => {
            const genericError = { code: '500', message: 'Internal DB Error' };

            mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
            mockSupabase.select.mockImplementationOnce(() => mockSupabase);
            mockSupabase.single.mockResolvedValueOnce({ data: null, error: genericError });

            await expect(userService.createUser(MOCK_USER_DATA)).rejects.toMatchObject(genericError);
        });

        it('throws if password hashing fails', async () => {
            mockHashPassword.mockRejectedValue(new Error('Hashing service offline'));

            await expect(userService.createUser(MOCK_USER_DATA)).rejects.toThrow('Hashing service offline');
            expect(mockSupabase.insert).not.toHaveBeenCalled();
        });

        it('throws error if retrieving created user fails', async () => {
            // Step 2: user insert success
            mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
            mockSupabase.select.mockImplementationOnce(() => mockSupabase);
            mockSupabase.single.mockResolvedValueOnce({ data: MOCK_DB_USER, error: null });

            // Step 3: profile insert success (returns object with no error)
            mockSupabase.insert.mockResolvedValueOnce({ error: null });

            // Step 6: final fetch returns null
            mockFindUserByEmail.mockResolvedValueOnce(null);

            await expect(userService.createUser(MOCK_USER_DATA)).rejects.toThrow('Failed to retrieve created user');
        });

        it('continues when profile creation fails', async () => {
            // Step 2: insert successful
            mockSupabase.insert.mockImplementationOnce(() => mockSupabase);
            mockSupabase.select.mockImplementationOnce(() => mockSupabase);
            mockSupabase.single.mockResolvedValueOnce({ data: MOCK_DB_USER, error: null });

            // Step 3: profile insert returns error
            mockSupabase.insert.mockResolvedValueOnce({ error: { code: '400', message: 'Profile error' } });

            // Step 6: final fetch
            mockFindUserByEmail.mockResolvedValueOnce(MOCK_DB_USER);

            const result = await userService.createUser(MOCK_USER_DATA);
            expect(result).toEqual(MOCK_USER_RESPONSE);
        });
    });

    // =========================================================================
    // updateUserPreferences Tests
    // =========================================================================

    describe('updateUserPreferences', () => {
        const testEmail = 'update@example.com';

        it('should record terms acceptance when acceptTandC is true', async () => {
            // mockCreateTermsAcceptance is mocked in beforeEach to resolve
            await userService.updateUserPreferences(testEmail, true, undefined);

            expect(mockCreateTermsAcceptance).toHaveBeenCalledWith(testEmail);
            expect(mockCreateNewsletterSubscription).not.toHaveBeenCalled();
            expect(mockUnsubscribeFromNewsletter).not.toHaveBeenCalled();
        });

        it('should not throw if terms are already accepted', async () => {
            mockCreateTermsAcceptance.mockRejectedValue(new Error('TERMS_ALREADY_ACCEPTED'));

            await expect(userService.updateUserPreferences(testEmail, true, undefined)).resolves.toBeUndefined();

            expect(mockCreateTermsAcceptance).toHaveBeenCalledWith(testEmail);
        });

        it('should subscribe to newsletter when newsLetterSubs is true', async () => {
            // mockCreateNewsletterSubscription is mocked in beforeEach to resolve
            await userService.updateUserPreferences(testEmail, undefined, true);

            expect(mockCreateNewsletterSubscription).toHaveBeenCalledWith(testEmail);
            expect(mockCreateTermsAcceptance).not.toHaveBeenCalled();
            expect(mockUnsubscribeFromNewsletter).not.toHaveBeenCalled();
        });

        it('should not throw if already subscribed to newsletter', async () => {
            mockCreateNewsletterSubscription.mockRejectedValue(new Error('NEWSLETTER_ALREADY_SUBSCRIBED'));

            await expect(userService.updateUserPreferences(testEmail, undefined, true)).resolves.toBeUndefined();

            expect(mockCreateNewsletterSubscription).toHaveBeenCalledWith(testEmail);
        });

        it('should unsubscribe from newsletter when newsLetterSubs is false', async () => {
            mockUnsubscribeFromNewsletter.mockResolvedValue(null);

            await userService.updateUserPreferences(testEmail, undefined, false);

            expect(mockUnsubscribeFromNewsletter).toHaveBeenCalledWith(testEmail);
            expect(mockCreateNewsletterSubscription).not.toHaveBeenCalled();
            expect(mockCreateTermsAcceptance).not.toHaveBeenCalled();
        });

        it('should throw a custom error if terms acceptance fails for a different reason', async () => {
            mockCreateTermsAcceptance.mockRejectedValue(new Error('DB failure'));
            await expect(userService.updateUserPreferences(testEmail, true, undefined)).rejects.toThrow('Failed to update user preferences');
        });

        it('should throw a custom error if newsletter subscription fails for a different reason', async () => {
            mockCreateNewsletterSubscription.mockRejectedValue(new Error('DB failure'));
            await expect(userService.updateUserPreferences(testEmail, undefined, true)).rejects.toThrow('Failed to update user preferences');
        });

        it('should throw a custom error if newsletter unsubscription fails', async () => {
            mockUnsubscribeFromNewsletter.mockRejectedValue(new Error('Unsubscribe failed'));
            await expect(userService.updateUserPreferences(testEmail, undefined, false)).rejects.toThrow('Failed to update user preferences');
        });
    });

    // =========================================================================
    // getUserPreferences Tests
    // =========================================================================

    describe('getUserPreferences', () => {
        const testEmail = 'prefs@example.com';

        it('should return correct preference states when both are true', async () => {
            mockHasAcceptedTerms.mockResolvedValue(true);
            mockIsSubscribedToNewsletter.mockResolvedValue(true);

            const result = await userService.getUserPreferences(testEmail);

            expect(result).toEqual({
                hasAcceptedTerms: true,
                isSubscribedToNewsletter: true
            });
            expect(mockHasAcceptedTerms).toHaveBeenCalledWith(testEmail);
            expect(mockIsSubscribedToNewsletter).toHaveBeenCalledWith(testEmail);
        });

        it('should return correct preference states when both are false', async () => {
            mockHasAcceptedTerms.mockResolvedValue(false);
            mockIsSubscribedToNewsletter.mockResolvedValue(false);

            const result = await userService.getUserPreferences(testEmail);

            expect(result).toEqual({
                hasAcceptedTerms: false,
                isSubscribedToNewsletter: false
            });
        });

        it('should throw a custom error if preference retrieval fails', async () => {
            mockHasAcceptedTerms.mockRejectedValue(new Error('Terms check failed'));
            mockIsSubscribedToNewsletter.mockResolvedValue(true);
            await expect(userService.getUserPreferences(testEmail)).rejects.toThrow('Failed to get user preferences');
        });
    });
});