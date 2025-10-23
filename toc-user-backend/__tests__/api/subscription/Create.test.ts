import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

jest.mock('../../../services/SubscriptionService', () => ({
  createOrUpdateSubscription: jest.fn(),
}));

import handler from '../../../api/subscription/Create';
import { createOrUpdateSubscription } from '../../../services/SubscriptionService';

const mockedCreateOrUpdate = createOrUpdateSubscription as jest.Mock;

function makeAuthHeader(email: string = 'user@example.com'): string {
  const token = jwt.sign({ email, userId: 1, sub: '1' }, process.env.JWT_SECRET!);
  return `Bearer ${token}`;
}

function makeReqRes(method: string, headers: Record<string, string> = {}, body?: Record<string, any>): { req: VercelRequest; res: VercelResponse } {
  const req = { method, headers, url: '/api/subscription/create', body } as unknown as VercelRequest;
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn(), end: jest.fn() } as unknown as VercelResponse;
  return { req, res };
}

const SUB_INPUT = {
  email: 'user@example.com',
  planId: 'basic',
  autoRenew: true,
};

const SUB_RESULT = {
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

describe('Subscription Create API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader() });
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
    expect(mockedCreateOrUpdate).not.toHaveBeenCalled();
  });

  it('returns 401 when no token provided', async () => {
    const { req, res } = makeReqRes('POST', {}, SUB_INPUT);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('No token provided');
  });

  it('returns 401 on invalid token', async () => {
    const badToken = jwt.sign({ email: 'user@example.com', userId: 1, sub: '1' }, 'bad-secret');
    const { req, res } = makeReqRes('POST', { authorization: `Bearer ${badToken}` }, SUB_INPUT);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('Invalid token');
  });

  it('returns 201 on successful createOrUpdate', async () => {
    mockedCreateOrUpdate.mockResolvedValue(SUB_RESULT);
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader(SUB_RESULT.email) }, SUB_INPUT);
    await handler(req, res);
    const callArg = (mockedCreateOrUpdate as jest.Mock).mock.calls[0][0];
    expect(callArg).toMatchObject({ email: SUB_INPUT.email, planId: SUB_INPUT.planId, autoRenew: SUB_INPUT.autoRenew });
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, statusCode: 201, message: 'Subscription created successfully', data: SUB_RESULT });
  });

  it('returns 404 when plan not found', async () => {
    mockedCreateOrUpdate.mockRejectedValue(new Error('PLAN_NOT_FOUND'));
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader('user@example.com') }, { ...SUB_INPUT, planId: 'missing' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 404, message: 'Plan not found' });
  });

  it('returns 500 on unexpected service error', async () => {
    mockedCreateOrUpdate.mockRejectedValue(new Error('Unexpected failure'));
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader('user@example.com') }, SUB_INPUT);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.statusCode).toBe(500);
  });

  it('sets CORS headers with default origin when none provided', async () => {
    mockedCreateOrUpdate.mockResolvedValue(SUB_RESULT);
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader(SUB_RESULT.email) }, SUB_INPUT);
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
  });

  it('sets CORS headers using request origin', async () => {
    mockedCreateOrUpdate.mockResolvedValue(SUB_RESULT);
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader(SUB_RESULT.email), origin: 'https://example.com' }, SUB_INPUT);
    await handler(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });
});