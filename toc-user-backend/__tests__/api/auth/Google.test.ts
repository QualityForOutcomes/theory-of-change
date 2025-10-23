import type { VercelRequest, VercelResponse } from '@vercel/node';

// Ensure JWT secret and allowed origins for CORS
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

// Mocks for Firebase and Supabase utilities
const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));
jest.mock('../../../utils/supabaseUtils/UserUtils', () => ({
  upsertGoogleUser: jest.fn(),
}));
jest.mock('../../../utils/supabaseUtils/SessionUtils', () => ({
  createUserSession: jest.fn(),
}));

import handler from '../../../api/auth/Google';
import { upsertGoogleUser } from '../../../utils/supabaseUtils/UserUtils';
import { createUserSession } from '../../../utils/supabaseUtils/SessionUtils';

const mockedUpsert = upsertGoogleUser as jest.Mock;
const mockedCreateSession = createUserSession as jest.Mock;

function makeReqRes(method: string, body: any = {}, origin?: string): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    body,
    headers: origin ? { origin } as any : {},
    url: '/api/auth/google',
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

describe('Google auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 Method Not Allowed for non-POST methods', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 405, message: 'Method not allowed' });
  });

  it('handles OPTIONS preflight and ends response early', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);

    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 500 when Firebase admin not initialized', async () => {
    jest.resetModules();
    const localVerifyMock = jest.fn();
    jest.doMock('firebase-admin', () => ({ apps: [] }));
    jest.doMock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: localVerifyMock }) }));
    const localHandler = (await import('../../../api/auth/Google')).default;

    const { req, res } = makeReqRes('POST', { idToken: 'token' });
    await localHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Firebase admin not initialized');
  });

  it('returns 200 on successful Google login with user and token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'abc123',
      email: 'user@example.com',
      name: 'Jane Doe',
      picture: 'http://avatar',
    });

    mockedUpsert.mockResolvedValue({
      user_id: 1,
      email: 'user@example.com',
      username: 'jane',
      user_role: 'user',
      profile: {
        first_name: 'Jane',
        last_name: 'Doe',
        organisation: 'Org',
        avatar_url: 'http://avatar',
      },
    });

    mockedCreateSession.mockResolvedValue({});

    const { req, res } = makeReqRes('POST', { idToken: 'valid' }, 'https://example.com');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toBe('Google login successful');
    expect(payload.data.token).toBeDefined();
    expect(payload.data.user.displayName).toBe('Jane Doe');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });

  it('returns 401 Unauthorized when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

    const { req, res } = makeReqRes('POST', { idToken: 'bad' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 401, message: 'Invalid token' });
  });
});