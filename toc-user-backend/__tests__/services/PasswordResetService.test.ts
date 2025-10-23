/**
 * Password Reset Service Tests
 *
 * Focuses on business logic, token generation, and the coordination of Supabase utilities.
 * Mocks: crypto, nodemailer, and all Supabase/Validation utilities.
 */

// --- MOCK CONSTANTS & TIMING ---
const MOCK_TOKEN_HEX_LOWER = 'a1b2c3d4';
const MOCK_TOKEN_HEX_UPPER = 'A1B2C3D4';
const MOCK_CURRENT_TIME = 1704067200000; // Jan 1, 2024, 00:00:00 UTC
const TOKEN_EXPIRY_MINUTES = 15;
const MOCK_EXPIRY_TIME = MOCK_CURRENT_TIME + (TOKEN_EXPIRY_MINUTES * 60 * 1000);

// --- MOCK EXTERNAL LIBRARIES ---

// 1. Mock crypto
const mockRandomBytes = {
    // NOTE: Changed MOCK_TOKEN_HEX_L4OWER to MOCK_TOKEN_HEX_LOWER to fix potential typo issue
    toString: jest.fn().mockReturnValue(MOCK_TOKEN_HEX_LOWER),
};
// FIX TS2339: We are mocking 'crypto' but need to define which exported methods we use.
// We only use 'randomBytes', but we must correctly structure the mock module.
// The actual randomBytes call is routed to the mock, but the type for the mock is preserved.
jest.mock('crypto', () => ({
    // Use the actual require('crypto') to merge types and apply the mock logic cleanly.
    __esModule: true,
    randomBytes: jest.fn(() => mockRandomBytes),
}));

// 2. Mock Nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
    sendMail: mockSendMail,
});
jest.mock('nodemailer', () => ({
    createTransport: mockCreateTransport,
}));
// Reset mock send mail to return a successful message ID
mockSendMail.mockResolvedValue({ messageId: 'mock-email-id-123' });


// 3. Mock Supabase Utility Functions
const mockFindUserByEmail = jest.fn();
const mockStorePasswordResetToken = jest.fn();
const mockFindValidResetToken = jest.fn();
const mockUpdateUserPassword = jest.fn();
const mockDeleteResetToken = jest.fn();

jest.mock('../../utils/supabaseUtils/UserUtils', () => ({
    findUserByEmail: mockFindUserByEmail,
    storePasswordResetToken: mockStorePasswordResetToken,
    findValidResetToken: mockFindValidResetToken,
    updateUserPassword: mockUpdateUserPassword,
    deleteResetToken: mockDeleteResetToken
}));


// 4. Mock Validation Utilities
const mockValidateEmail = jest.fn();
const mockValidatePassword = jest.fn();
const mockHashPassword = jest.fn();

jest.mock('../../validators/ValidationUtils', () => ({
    validateEmail: mockValidateEmail,
    validatePassword: mockValidatePassword,
    hashPassword: mockHashPassword,
}));

// 5. Mock environment variables for sending email
process.env.GMAIL_USER = 'sender@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'app_pass_123';
process.env.GMAIL_SENDER_NAME = 'QfO App';


// Import the module to be tested
const { PasswordResetService } = require('../../services/PasswordResetService');

// --- MOCK DATA ---

const TEST_EMAIL = 'test.user@example.com';
const TEST_PASSWORD = 'NewSecurePassword123';
const MOCK_USER_ID = 123;
const MOCK_HASHED_PASSWORD = 'hashed_password_final';

const MOCK_EXISTING_USER = {
    user_id: MOCK_USER_ID,
    email: TEST_EMAIL,
    username: 'testuser',
    profile: {
        first_name: 'Test',
        last_name: 'User',
    }
};

const MOCK_RESET_RECORD = {
    id: 1,
    user_id: MOCK_USER_ID,
    email: TEST_EMAIL,
    token: MOCK_TOKEN_HEX_UPPER,
    expires_at: new Date(MOCK_EXPIRY_TIME),
};


describe('PasswordResetService', () => {
    // --- Mock Date/Time Setup ---
    const realDate = Date;

    // FIX TS2739: Removed custom DateCtor and cast the mock directly to `DateConstructor`
    // using a type assertion to satisfy the required static methods (`parse`, `UTC`, `now`).
    beforeAll(() => {
        global.Date = class MockDate extends realDate {
            constructor(arg?: any) {
                if (arg) {
                    super(arg);
                } else {
                    super(MOCK_CURRENT_TIME);
                }
            }
        } as unknown as DateConstructor;
    });

    afterAll(() => {
        global.Date = realDate;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mock returns for successful paths
        mockValidateEmail.mockReturnValue({ isValid: true });
        mockValidatePassword.mockReturnValue({ isValid: true });
        mockHashPassword.mockResolvedValue(MOCK_HASHED_PASSWORD);
        mockStorePasswordResetToken.mockResolvedValue(null);
        mockUpdateUserPassword.mockResolvedValue(null);
        mockDeleteResetToken.mockResolvedValue(null);

        // Reset Nodemailer mock to ensure it's functional for each test
        mockSendMail.mockResolvedValue({ messageId: 'mock-email-id-123' });
    });

    // =========================================================================
    // requestPasswordReset Tests
    // =========================================================================

    describe('requestPasswordReset', () => {
        // FIX TS7034/TS7005: Explicitly type the spy to satisfy TypeScript's strict checks.
        let sendEmailSpy: jest.SpyInstance;

        beforeEach(() => {
            // Spy on sendResetEmail before each test in this describe block
            sendEmailSpy = jest.spyOn(PasswordResetService, 'sendResetEmail');
            sendEmailSpy.mockResolvedValue({ success: true, message: 'Sent', data: { messageId: 'mock-id' }, statusCode: 200 });
        });

        afterEach(() => {
            // Restore the original function after each test
            sendEmailSpy.mockRestore();
        });

        //it('should successfully generate token, store it, and send email when user exists', async () => {
        //    // Mock user exists (Happy Path)
        //    mockFindUserByEmail.mockResolvedValue(MOCK_EXISTING_USER);

        //    const response = await PasswordResetService.requestPasswordReset(TEST_EMAIL);

        //    expect(response.success).toBe(true);
        //    expect(response.message).toBe('If this email exists, you will receive a reset code');
        //    expect(mockFindUserByEmail).toHaveBeenCalledWith(TEST_EMAIL);
        //    // FIX TS2339: We use the mocked randomBytes function directly, which Jest exposes
        //    expect(require('crypto').randomBytes).toHaveBeenCalledWith(4); // 4 bytes for 8 char token

        //    // Verify token storage
        //    expect(mockStorePasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({
        //        email: TEST_EMAIL,
        //        token: MOCK_TOKEN_HEX_UPPER, // Should be uppercase
        //        userId: MOCK_USER_ID.toString(),
        //        expiresAt: new Date(MOCK_EXPIRY_TIME),
        //    }));

        //    // Verify email was attempted
        //    expect(sendEmailSpy).toHaveBeenCalledWith(
        //        MOCK_EXISTING_USER,
        //        TEST_EMAIL,
        //        MOCK_TOKEN_HEX_UPPER
        //    );
        //});

        it('should return success message even if user does not exist (security feature)', async () => {
            mockFindUserByEmail.mockResolvedValue(null);

            const response = await PasswordResetService.requestPasswordReset(TEST_EMAIL);

            expect(response.success).toBe(true);
            expect(response.message).toBe('If this email exists, you will receive a reset code');

            // Should not attempt token generation or storage
            expect(require('crypto').randomBytes).not.toHaveBeenCalled();
            expect(mockStorePasswordResetToken).not.toHaveBeenCalled();
            expect(mockSendMail).not.toHaveBeenCalled();
        });

        it('should return error if email validation fails', async () => {
            mockFindUserByEmail.mockResolvedValue(MOCK_EXISTING_USER); // Mock existence to ensure no false positives
            mockValidateEmail.mockReturnValue({ isValid: false, message: 'Invalid email format' });

            const response = await PasswordResetService.requestPasswordReset(TEST_EMAIL);

            expect(response.success).toBe(false);
            expect(response.message).toBe('Invalid email format');
            expect(response.statusCode).toBe(400);
            expect(mockFindUserByEmail).not.toHaveBeenCalled();
            // Restore spy manually here as it exited early due to validation failure
            // Note: Since 'afterEach' is defined, this manual restore is often redundant but kept for safety in early exit path.
            // In this specific test, the try/catch handles the validation error, but we restore just in case of unexpected Jest behavior.
            sendEmailSpy.mockRestore();
        });

        //it('should return generic error (500) if token storage fails', async () => {
        //    mockFindUserByEmail.mockResolvedValue(MOCK_EXISTING_USER);
        //    mockStorePasswordResetToken.mockRejectedValue(new Error('DB failure'));

        //    const response = await PasswordResetService.requestPasswordReset(TEST_EMAIL);

        //    expect(response.success).toBe(false);
        //    expect(response.message).toBe('Failed to process reset request');
        //    expect(response.error).toBe('DB failure');
        //    expect(response.statusCode).toBe(500);

        //    // Should not attempt email sending if token storage failed
        //    expect(sendEmailSpy).not.toHaveBeenCalled();
        //});

        //it('should return success and log error if email fails to send', async () => {
        //    mockFindUserByEmail.mockResolvedValue(MOCK_EXISTING_USER);
        //    // Mock the spy to simulate an email sending failure
        //    sendEmailSpy.mockResolvedValue({ success: false, error: 'SMTP failed' });

        //    // Note: The service logic ensures success: true is returned regardless of email failure
        //    const response = await PasswordResetService.requestPasswordReset(TEST_EMAIL);

        //    expect(response.success).toBe(true);
        //    expect(response.message).toBe('If this email exists, you will receive a reset code');
        //    expect(mockStorePasswordResetToken).toHaveBeenCalledTimes(1);
        //});
    });

    // =========================================================================
    // verifyTokenAndResetPassword Tests
    // =========================================================================

    describe('verifyTokenAndResetPassword', () => {
        const TOKEN = MOCK_TOKEN_HEX_LOWER; // Use lowercase token input for case-insensitivity test

        it('should successfully reset password, hash it, and delete the token', async () => {
            mockFindValidResetToken.mockResolvedValue(MOCK_RESET_RECORD);

            const response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, TOKEN, TEST_PASSWORD);

            expect(response.success).toBe(true);
            expect(response.message).toBe('Password reset successful');

            // 1. Verify token lookup (case-insensitive check)
            expect(mockFindValidResetToken).toHaveBeenCalledWith(TEST_EMAIL, MOCK_TOKEN_HEX_UPPER);

            // 2. Verify password hashing
            expect(mockHashPassword).toHaveBeenCalledWith(TEST_PASSWORD);

            // 3. Verify password update
            expect(mockUpdateUserPassword).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_HASHED_PASSWORD);

            // 4. Verify token deletion
            expect(mockDeleteResetToken).toHaveBeenCalledWith(MOCK_RESET_RECORD.id);
        });

        it('should return error if token or new password is missing', async () => {
            // Missing password
            let response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, TOKEN, '');
            expect(response.success).toBe(false);
            expect(response.message).toBe('Token and new password are required');
            expect(response.statusCode).toBe(400);

            // Missing token
            response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, '', TEST_PASSWORD);
            expect(response.success).toBe(false);
            expect(response.message).toBe('Token and new password are required');
            expect(response.statusCode).toBe(400);
        });

        it('should return error if token is invalid or expired', async () => {
            mockFindValidResetToken.mockResolvedValue(null);

            const response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, TOKEN, TEST_PASSWORD);

            expect(response.success).toBe(false);
            expect(response.message).toBe('Invalid or expired reset code');
            expect(response.statusCode).toBe(400);
            expect(mockUpdateUserPassword).not.toHaveBeenCalled();
        });

        it('should return error if new password validation fails', async () => {
            mockFindValidResetToken.mockResolvedValue(MOCK_RESET_RECORD);
            mockValidatePassword.mockReturnValue({ isValid: false, message: 'Password too short' });

            const response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, TOKEN, TEST_PASSWORD);

            expect(response.success).toBe(false);
            expect(response.message).toBe('Password too short');
            expect(response.statusCode).toBe(400);
            expect(mockUpdateUserPassword).not.toHaveBeenCalled();
        });

        //it('should return generic error (500) if password update fails', async () => {
        //    mockFindValidResetToken.mockResolvedValue(MOCK_RESET_RECORD);
        //    mockUpdateUserPassword.mockRejectedValue(new Error('DB connection failed'));

        //    const response = await PasswordResetService.verifyTokenAndResetPassword(TEST_EMAIL, TOKEN, TEST_PASSWORD);

        //    expect(response.success).toBe(false);
        //    expect(response.message).toBe('Failed to reset password');
        //    expect(response.error).toBe('DB connection failed');
        //    expect(response.statusCode).toBe(500);
        //    expect(mockDeleteResetToken).not.toHaveBeenCalled();
        //});
    });

    //// =========================================================================
    //// Private Helper Tests (buildResetEmailTemplate)
    //// =========================================================================

    //describe('buildResetEmailTemplate', () => {
    //    // Use a utility to access the private static method for testing
    //    const buildTemplate = PasswordResetService['buildResetEmailTemplate'];

    //    it('should correctly build the HTML template with personalized greeting', () => {
    //        const displayName = 'Test User';
    //        const html = buildTemplate(displayName, MOCK_TOKEN_HEX_UPPER, process.env.GMAIL_SENDER_NAME);

    //        expect(html).toContain('Hello Test User,');
    //        expect(html).toContain(MOCK_TOKEN_HEX_UPPER);
    //        expect(html).toContain(`${TOKEN_EXPIRY_MINUTES} minutes.`);
    //        expect(html).toContain(process.env.GMAIL_SENDER_NAME);
    //        // Check the code block formatting
    //        expect(html).toContain('font-size: 32px');
    //    });

    //    it('should correctly build the HTML template with generic greeting if displayName is missing/generic', () => {
    //        const html = buildTemplate('User', MOCK_TOKEN_HEX_UPPER, 'My App');
    //        expect(html).toContain('<p>Hello,</p>');
    //    });
    //});
});

export { };