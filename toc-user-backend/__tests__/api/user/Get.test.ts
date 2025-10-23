import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Ensure JWT secret matches middleware default for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Mock the UserService used by the handler
jest.mock('../../../services/UserService', () => ({
    getUserProfile: jest.fn(),
}));

import handler from '../../../api/user/Get';
import { getUserProfile } from '../../../services/UserService';

const mockedGetUserProfile = getUserProfile as jest.Mock;

// Helper to create mock req/res objects
function makeReqRes(method: string, headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
    const req = {
        method,
        headers,
        url: '/api/user/get',
        query: {},
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

const PROFILE_RESPONSE = {
    userId: 1,
    email: 'user@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    organisation: 'Org',
    avatarUrl: '',
    displayName: 'Test User',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    userRole: 'user',
};

describe('api/user/Get handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 200 OK when profile retrieval succeeds', async () => {
        mockedGetUserProfile.mockResolvedValue(PROFILE_RESPONSE);

        const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(PROFILE_RESPONSE.email) });
        await handler(req, res);

        expect(mockedGetUserProfile).toHaveBeenCalledWith(PROFILE_RESPONSE.email);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: true,
            message: 'User details retrieved successfully',
            statusCode: 200,
            data: PROFILE_RESPONSE,
        });
    });

    it('returns 404 Not Found when user does not exist', async () => {
        mockedGetUserProfile.mockResolvedValue(null);

        const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader('nouser@example.com') });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            message: 'User not found',
            statusCode: 404,
        });
    });

    it('returns 401 Unauthorized when token missing', async () => {
        const { req, res } = makeReqRes('GET');
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
        const { req, res } = makeReqRes('GET', { authorization: 'Bearer invalid' });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            error: 'Invalid token',
            statusCode: 401,
        });
    });

    it('returns 405 Method Not Allowed for non-GET methods', async () => {
        const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader() });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload).toMatchObject({
            success: false,
            statusCode: 405,
            message: 'Method not allowed',
        });
    });

    it('handles OPTIONS preflight and ends response early', async () => {
        const { req, res } = makeReqRes('OPTIONS');
        await handler(req, res);

        expect(res.end).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(mockedGetUserProfile).not.toHaveBeenCalled();
    });

    it('sets CORS headers with default origin when none provided', async () => {
        mockedGetUserProfile.mockResolvedValue(PROFILE_RESPONSE);

        const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(PROFILE_RESPONSE.email) });
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    });

    it('sets CORS headers using request origin', async () => {
        mockedGetUserProfile.mockResolvedValue(PROFILE_RESPONSE);

        const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(PROFILE_RESPONSE.email) });
        (req as any).headers = { ...req.headers, origin: 'http://localhost:3000' };
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    });

    it('returns 500 on unexpected service error', async () => {
        mockedGetUserProfile.mockRejectedValue(new Error('Unexpected failure'));

        const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(PROFILE_RESPONSE.email) });
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.statusCode).toBe(500);
    });
});