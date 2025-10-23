/**
 * ValidationUtils.ts Tests
 *
 * Covers email, password, username, and field format validations.
 */

// Mock bcrypt to control hashing behavior
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
}));

const ValidationUtils = require('../../validators/ValidationUtils').default;
const bcrypt = require('bcrypt');

describe('ValidationUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Email
    describe('isValidEmail', () => {
        it('accepts valid email', () => {
            expect(ValidationUtils.isValidEmail('user@example.com')).toBe(true);
        });

        it('rejects email without domain dot', () => {
            expect(ValidationUtils.isValidEmail('user@domain')).toBe(false);
        });

        it('rejects email without at', () => {
            expect(ValidationUtils.isValidEmail('userexample.com')).toBe(false);
        });
    });

    // Password
    describe('validatePassword', () => {
        it('rejects empty password', () => {
            const res = ValidationUtils.validatePassword('');
            expect(res.isValid).toBe(false);
            expect(res.message).toContain('required');
        });

        it('rejects short password', () => {
            const res = ValidationUtils.validatePassword('Ab1');
            expect(res.isValid).toBe(false);
            expect(res.message).toContain('at least 8');
        });

        it('rejects missing lowercase', () => {
            const res = ValidationUtils.validatePassword('AAAAAAAA1');
            expect(res.isValid).toBe(false);
            expect(res.message).toContain('lowercase');
        });

        it('rejects missing uppercase', () => {
            const res = ValidationUtils.validatePassword('aaaaaaa1');
            expect(res.isValid).toBe(false);
            expect(res.message).toContain('uppercase');
        });

        it('rejects missing number', () => {
            const res = ValidationUtils.validatePassword('ValidPass');
            expect(res.isValid).toBe(false);
            expect(res.message).toContain('number');
        });

        it('accepts strong password', () => {
            const res = ValidationUtils.validatePassword('ValidPass1');
            expect(res.isValid).toBe(true);
        });
    });

    // Username
    describe('isValidUsername', () => {
        it('accepts valid usernames', () => {
            expect(ValidationUtils.isValidUsername('john_doe')).toBe(true);
            expect(ValidationUtils.isValidUsername('user123')).toBe(true);
            expect(ValidationUtils.isValidUsername('Jane_Smith_2025')).toBe(true);
        });

        it('rejects invalid usernames', () => {
            expect(ValidationUtils.isValidUsername('jo')).toBe(false);
            expect(ValidationUtils.isValidUsername('john doe')).toBe(false);
            expect(ValidationUtils.isValidUsername('user@123')).toBe(false);
        });
    });

    // Field formats
    describe('validateFieldFormats', () => {
        it('errors when userId looks like email but invalid format', () => {
            const errors = ValidationUtils.validateFieldFormats({ userId: 'user@domain' });
            expect(errors).toContain('userId must be a valid email format');
        });

        it('errors when projectTitle exceeds max length', () => {
            const longTitle = 'a'.repeat(201);
            const errors = ValidationUtils.validateFieldFormats({ projectTitle: longTitle });
            expect(errors.some(e => e.includes('must not exceed'))).toBe(true);
        });

        it('errors for invalid evidenceLinks URL and accepts valid ones', () => {
            const errors = ValidationUtils.validateFieldFormats({ evidenceLinks: ['https://example.com', 'htp://bad-url', 'not a url'] });
            expect(errors).not.toContain('evidenceLinks[0] must be a valid URL');
            expect(errors).not.toContain('evidenceLinks[1] must be a valid URL');
            expect(errors).toContain('evidenceLinks[2] must be a valid URL');
        });

        it('no errors for valid formats', () => {
            const errors = ValidationUtils.validateFieldFormats({ userId: 'valid@example.com', projectTitle: 'Short', evidenceLinks: ['https://example.com'] });
            expect(errors).toEqual([]);
        });
    });

    // validateEmail
    describe('validateEmail', () => {
        it('fails when email is missing', () => {
            const res = ValidationUtils.validateEmail('');
            expect(res.isValid).toBe(false);
            expect(res.message).toBe('Email is required');
        });

        it('fails when email format is invalid', () => {
            const res = ValidationUtils.validateEmail('bad@domain');
            expect(res.isValid).toBe(false);
            expect(res.message).toBe('Invalid email format');
        });

        it('passes when email is valid', () => {
            const res = ValidationUtils.validateEmail('user@example.com');
            expect(res.isValid).toBe(true);
            expect(res.message).toBe('Email is valid');
        });
    });

    // hashPassword
    describe('hashPassword', () => {
        it('returns hashed string on success', async () => {
            bcrypt.hash.mockResolvedValue('mockHash');
            const hash = await ValidationUtils.hashPassword('secret');
            expect(hash).toBe('mockHash');
            expect(bcrypt.hash).toHaveBeenCalledWith('secret', expect.any(Number));
        });

        it('throws custom error when hashing fails', async () => {
            bcrypt.hash.mockRejectedValue(new Error('bcrypt down'));
            await expect(ValidationUtils.hashPassword('secret')).rejects.toThrow('Failed to hash password');
        });
    });

    // Project validators
    describe('validateProjectForCreate', () => {
        it('passes minimal valid data', () => {
            const errors = ValidationUtils.validateProjectForCreate({ projectTitle: 'My Project' });
            expect(errors).toEqual([]);
        });

        it('fails on invalid optional types and status', () => {
            const errors = ValidationUtils.validateProjectForCreate({
                projectTitle: 'P',
                objectives: 'not array',
                activities: 'no',
                outcomes: {},
                externalFactors: 123,
                evidenceLinks: 'not array',
                beneficiaries: 'not object',
                status: 'invalid'
            } as any);
            expect(errors).toContain('objectives must be an array');
            expect(errors).toContain('activities must be an array');
            expect(errors).toContain('outcomes must be an array');
            expect(errors).toContain('externalFactors must be an array');
            expect(errors).toContain('evidenceLinks must be an array');
            expect(errors).toContain('beneficiaries must be an object');
            expect(errors.some(e => e.includes('status must be one of'))).toBe(true);
        });

        it('fails on beneficiaries nested types', () => {
            const errors = ValidationUtils.validateProjectForCreate({
                projectTitle: 'P',
                beneficiaries: { description: 42, estimatedReach: '100' }
            } as any);
            expect(errors).toContain('beneficiaries.description must be a string');
            expect(errors).toContain('beneficiaries.estimatedReach must be a number');
        });
    });

    describe('validateProjectForUpdate', () => {
        it('fails when required fields missing', () => {
            const errors = ValidationUtils.validateProjectForUpdate({});
            expect(errors).toContain('userId is required and must be a string');
            expect(errors).toContain('projectId is required and must be a string');
            expect(errors).toContain('projectTitle is required and must be a string');
        });

        it('includes optional field errors without duplicate projectTitle error', () => {
            const errors = ValidationUtils.validateProjectForUpdate({ userId: 'u', projectId: 'p', projectTitle: 't', objectives: 'bad' } as any);
            expect(errors).toContain('objectives must be an array');
            expect(errors.filter(e => e.includes('projectTitle is required')).length).toBe(0);
        });
    });

    describe('validateProject (legacy)', () => {
        it('reports all required fields missing and type errors', () => {
            const invalidProject = {
                status: 'draft',
                tocData: {} // missing everything
            } as any;
            const errors = ValidationUtils.validateProject(invalidProject);
            expect(errors).toContain('projectTitle is required and must be a string');
            expect(errors).toContain('bigPictureGoal is required and must be a string');
            expect(errors).toContain('projectAim is required and must be a string');
            expect(errors).toContain('objectives must be an array');
            expect(errors).toContain('beneficiaries must be an object');
            expect(errors).toContain('activities must be an array');
            expect(errors).toContain('outcomes must be an array');
            expect(errors).toContain('externalFactors must be an array');
            expect(errors).toContain('evidenceLinks must be an array');
        });
    });
});