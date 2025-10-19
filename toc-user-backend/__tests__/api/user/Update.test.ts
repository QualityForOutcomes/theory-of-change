import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Ensure JWT secret matches middleware default for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Mock the Supabase UserUtils used by the handler
jest.mock('../../../utils/supabaseUtils/UserUtils', () => ({
    findUserByEmail: jest.fn(),
    updateUserDetails: jest.fn(),
    checkUsernameExists: jest.fn(),
    getUserProfile: jest.fn(),
}));

import handler from '../../../api/user/Update';
import {
    findUserByEmail,
    updateUserDetails,
    checkUsernameExists,
    getUserProfile,
} from '../../../utils/supabaseUtils/UserUtils';

const mockedFindUserByEmail = findUserByEmail as jest.Mock;
const mockedUpdateUserDetails = updateUserDetails as jest.Mock;
const mockedCheckUsernameExists = checkUsernameExists as jest.Mock;
const mockedGetUserProfile = getUserProfile as jest.Mock;

// Helper to create mock req/res objects
function makeReqRes(method: string = 'PUT', body: any = {}, headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
    const req = {
        method,
        headers,
        url: '/api/user/update',
        query: {},
        body,
    } as unknown as VercelRequest;

    const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        end: jest.fn(),
    } as unknown as VercelResponse;

    return { req, res };
}

// Build a valid auth header for authenticated requests
function makeAuthHeader(email: string = 'user@example.com'): string {
    const token = jwt.sign({ email, userId: 1, sub: '1' }, process.env.JWT_SECRET!);
    return `Bearer ${token}`;
}

const UPDATED_PROFILE = {
    userId: 1,
    email: 'user@example.com',
    username: 'updateduser',
    firstName: 'Updated',
    lastName: 'User',
    organisation: 'NewOrg',
    avatarUrl: 'http://example.com/avatar.png',
    displayName: 'Updated User',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    userRole: 'user',
};

describe('api/user/Update handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 200 OK when profile updated successfully', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'updateduser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockResolvedValue(UPDATED_PROFILE);

        const body = { username: 'updateduser', firstName: 'Updated' };
        const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader(UPDATED_PROFILE.email) });
        await handler(req, res);

        expect(mockedFindUserByEmail).toHaveBeenCalledWith(UPDATED_PROFILE.email);
        expect(mockedCheckUsernameExists).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: true,
            message: 'User details updated successfully',
            statusCode: 200,
            data: UPDATED_PROFILE,
        });
    });

    it('returns 404 Not Found when user does not exist', async () => {
        mockedFindUserByEmail.mockResolvedValue(null);

        const { req, res } = makeReqRes('PUT', { firstName: 'Nope' }, { authorization: makeAuthHeader('nouser@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            message: 'User not found',
            statusCode: 404,
        });
    });

    it('returns 409 Conflict when new username already taken', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedCheckUsernameExists.mockResolvedValue(true);

        const { req, res } = makeReqRes('PUT', { username: 'taken' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(mockedCheckUsernameExists).toHaveBeenCalledWith('taken');
        expect(mockedUpdateUserDetails).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(409);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            message: 'Username already taken',
            statusCode: 409,
        });
    });

    it('returns 400 Bad Request when username invalid (validator)', async () => {
        // Use an invalid username that fails ValidationUtils.isValidUsername
        const invalidBody = { username: 'invalid username!' };
        const { req, res } = makeReqRes('PUT', invalidBody, { authorization: makeAuthHeader('user@example.com') });

        await handler(req, res);

        // Fails at validator stage before calling services
        expect(mockedFindUserByEmail).not.toHaveBeenCalled();
        expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
        expect(mockedUpdateUserDetails).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(400);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.message).toBe('Validation failed');
        expect(Array.isArray(payload.error)).toBe(true);
        expect(payload.error).toEqual(
            expect.arrayContaining([
                'Username must be 3-30 characters and contain only letters, numbers, and underscores',
            ])
        );
    });

    it('does not check username when username is undefined', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockResolvedValue(UPDATED_PROFILE);

        const { req, res } = makeReqRes('PATCH', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('does not check username when username is empty string', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockResolvedValue({ ...UPDATED_PROFILE, username: '' });

        const { req, res } = makeReqRes('PUT', { username: '' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('sets CORS headers with default origin when none provided', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockResolvedValue(UPDATED_PROFILE);

        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    });

    it('sets CORS headers using allowed request origin', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockResolvedValue(UPDATED_PROFILE);

        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        (req as any).headers = { ...req.headers, origin: 'http://localhost:3001' };
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3001');
    });

    it('handles OPTIONS preflight and ends response early', async () => {
        const { req, res } = makeReqRes('OPTIONS');
        await handler(req, res);

        expect(res.end).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(mockedUpdateUserDetails).not.toHaveBeenCalled();
    });

    it('returns 405 Method Not Allowed for non-PUT/PATCH methods', async () => {
        const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            statusCode: 405,
            message: 'Method not allowed',
        });
    });

    it('returns 401 Unauthorized when token missing', async () => {
        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            error: 'No token provided',
            statusCode: 401,
        });
    });

    it('returns 401 Unauthorized for invalid token', async () => {
        const { req, res } = makeReqRes('PATCH', { firstName: 'Updated' }, { authorization: 'Bearer invalid' });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            error: 'Invalid token',
            statusCode: 401,
        });
    });

    it('maps service "duplicate" error to 409', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockRejectedValue(new Error('duplicate key'));

        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.statusCode).toBe(409);
    });

    it('maps service "not found" error to 404', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockResolvedValue({});
        mockedGetUserProfile.mockRejectedValue(new Error('Profile not found'));

        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.statusCode).toBe(404);
    });

    it('returns 500 on unexpected service error', async () => {
        mockedFindUserByEmail.mockResolvedValue({ username: 'currentuser' });
        mockedUpdateUserDetails.mockRejectedValue(new Error('Unexpected failure'));

        const { req, res } = makeReqRes('PUT', { firstName: 'Updated' }, { authorization: makeAuthHeader('user@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.statusCode).toBe(500);
    });
});