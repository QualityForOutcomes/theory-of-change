/**
 * PasswordResetService sendResetEmail Tests
 *
 * Covers environment validation and transporter error handling.
 */

// --- Mock Nodemailer ---
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });
jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));

// --- Import service after setting env vars ---
const buildService = () => require('../../services/PasswordResetService').PasswordResetService;

// --- Helper user object ---
const MOCK_USER = {
    user_id: 1,
    email: 'user@example.com',
    username: 'user1',
    profile: { first_name: 'First', last_name: 'Last' }
};

describe.skip('PasswordResetService.sendResetEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset env vars to a valid baseline
        process.env.GMAIL_USER;
        process.env.GMAIL_APP_PASSWORD = 'app_password';
        process.env.GMAIL_SENDER_NAME = 'QfO App';
        mockSendMail.mockResolvedValue({ messageId: 'email-123' });
    });

    it('succeeds when env is valid and sends mail with proper options', async () => {
        const PasswordResetService: any = buildService();
        const res = await PasswordResetService['sendResetEmail'](MOCK_USER, 'recipient@example.com', 'ABC12345');

        expect(res.success).toBe(true);
        expect(res.data).toEqual({ messageId: 'email-123' });
        expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
            service: 'gmail',
            auth: expect.objectContaining({ user: 'sender@gmail.com', pass: 'app_password' })
        }));
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            from: '"QfO App" <sender@gmail.com>',
            to: 'recipient@example.com',
            subject: 'Password Reset Code',
            html: expect.stringContaining('ABC12345'),
        }));
    });

    it('returns error when GMAIL_USER is missing', async () => {
        delete process.env.GMAIL_USER;
        const PasswordResetService: any = buildService();

        const res = await PasswordResetService['sendResetEmail'](MOCK_USER, 'recipient@example.com', 'ABC12345');
        expect(res.success).toBe(false);
        expect(res.message).toBe('Failed to send email');
        expect(res.error).toBe('GMAIL_USER environment variable is not set');
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('returns error when GMAIL_APP_PASSWORD is missing', async () => {
        delete process.env.GMAIL_APP_PASSWORD;
        const PasswordResetService: any = buildService();

        const res = await PasswordResetService['sendResetEmail'](MOCK_USER, 'recipient@example.com', 'ABC12345');
        expect(res.success).toBe(false);
        expect(res.error).toBe('GMAIL_APP_PASSWORD environment variable is not set');
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('handles transporter sendMail errors gracefully', async () => {
        mockSendMail.mockRejectedValue(new Error('SMTP failure'));
        const PasswordResetService: any = buildService();

        const res = await PasswordResetService['sendResetEmail'](MOCK_USER, 'recipient@example.com', 'ABC12345');
        expect(res.success).toBe(false);
        expect(res.error).toBe('SMTP failure');
    });

    it('defaults sender name when GMAIL_SENDER_NAME not set', async () => {
        delete process.env.GMAIL_SENDER_NAME;
        const PasswordResetService: any = buildService();

        await PasswordResetService['sendResetEmail'](MOCK_USER, 'recipient@example.com', 'ABC12345');
        const mailArg = mockSendMail.mock.calls[0][0];
        expect(mailArg.from).toMatch(/Quality for Outcomes/);
    });
});