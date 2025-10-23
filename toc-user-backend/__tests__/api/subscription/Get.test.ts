import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

jest.mock('../../../services/SubscriptionService', () => ({
  getSubscriptionById: jest.fn(),
  getUserSubscription: jest.fn(),
}));

import handler from '../../../api/subscription/Get';
import { getSubscriptionById, getUserSubscription } from '../../../services/SubscriptionService';

const mockedGetById = getSubscriptionById as jest.Mock;
const mockedGetUserSubscription = getUserSubscription as jest.Mock;

function makeAuthHeader(email: string = 'user@example.com'): string {
  const token = jwt.sign({ email, userId: 1, sub: '1' }, process.env.JWT_SECRET!);
  return `Bearer ${token}`;
}

function makeReqRes(method: string, headers: Record<string, string> = {}, query: Record<string, any> = {}): { req: VercelRequest; res: VercelResponse } {
  const req = { method, headers, url: '/api/subscription/get', query } as unknown as VercelRequest;
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn(), end: jest.fn() } as unknown as VercelResponse;
  return { req, res };
}

const SUB = {
  subscriptionId: 'sub_123',
  email: 'user@example.com',
  planId: 'basic',
  status: 'active',
  startDate: '2024-01-01T00:00:00.000Z',
  renewalDate: '2024-02-01T00:00:00.000Z',
  expiresAt: null,
  autoRenew: true,
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Subscription Get API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader() });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 405, message: 'Method not allowed' });
  });

  it('handles OPTIONS preflight and ends early', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockedGetById).not.toHaveBeenCalled();
    expect(mockedGetUserSubscription).not.toHaveBeenCalled();
  });

  it('returns 401 when no token provided', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('No token provided');
  });

  it('returns 401 on invalid token', async () => {
    const badToken = jwt.sign({ email: 'user@example.com', userId: 1, sub: '1' }, 'bad-secret');
    const { req, res } = makeReqRes('GET', { authorization: `Bearer ${badToken}` });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('Invalid token');
  });

  it('returns 404 when subscriptionId not found', async () => {
    mockedGetById.mockResolvedValue(null);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader('user@example.com') }, { subscriptionId: 'missing' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 404, message: 'Subscription not found' });
  });

  it('returns 403 when ownership does not match', async () => {
    mockedGetById.mockResolvedValue({ ...SUB, email: 'other@example.com' });
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader('user@example.com') }, { subscriptionId: SUB.subscriptionId });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 403, message: 'You do not have access to this subscription' });
  });

  it('returns 200 with subscription data when fetched by id', async () => {
    mockedGetById.mockResolvedValue(SUB);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(SUB.email) }, { subscriptionId: SUB.subscriptionId });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, statusCode: 200, message: 'Subscription retrieved successfully', data: SUB });
  });

  it('returns 200 with user subscription when no id provided', async () => {
    mockedGetUserSubscription.mockResolvedValue(SUB);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(SUB.email) });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, statusCode: 200, message: 'Subscription retrieved successfully', data: SUB });
  });

  it('sets CORS headers with default origin when none provided', async () => {
    mockedGetUserSubscription.mockResolvedValue(SUB);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(SUB.email) });
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
  });

  it('sets CORS headers using request origin', async () => {
    mockedGetUserSubscription.mockResolvedValue(SUB);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(SUB.email), origin: 'https://example.com' });
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });

  it('returns 500 on unexpected service error', async () => {
    mockedGetUserSubscription.mockRejectedValue(new Error('Unexpected failure'));
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader('user@example.com') });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.statusCode).toBe(500);
  });
});