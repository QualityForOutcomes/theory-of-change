import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

// Mocks
const mockBcryptCompare = jest.fn();
jest.mock('bcrypt', () => ({ compare: (...args: any[]) => mockBcryptCompare(...args) }));

jest.mock('../../../utils/supabaseUtils/UserUtils', () => ({
  findUserByEmail: jest.fn(),
}));

jest.mock('../../../utils/supabaseUtils/SessionUtils', () => ({
  createUserSession: jest.fn(),
}));

import handler from '../../../api/auth/Login';
import { findUserByEmail } from '../../../utils/supabaseUtils/UserUtils';
import { createUserSession } from '../../../utils/supabaseUtils/SessionUtils';

const mockedFindUserByEmail = findUserByEmail as jest.Mock;
const mockedCreateUserSession = createUserSession as jest.Mock;

function makeReqRes(method: string, body: any = {}, origin?: string): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    body,
    headers: origin ? { origin } as any : {},
    url: '/api/auth/login',
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

const USER = {
  user_id: 1,
  email: 'user@example.com',
  username: 'testuser',
  password_hash: 'hashed',
  user_role: 'user',
  profile: {
    first_name: 'Test',
    last_name: 'User',
    organisation: 'Org',
    avatar_url: '',
  },
};

describe('Login auth API', () => {
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

  it('returns 400 Validation failed when email is invalid', async () => {
    const { req, res } = makeReqRes('POST', { email: 'bad', password: 'AnyPass' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(Array.isArray(payload.error)).toBe(true);
    expect(payload.error).toContain('Valid email is required');
  });

  it('returns 401 Unauthorized when user is not found', async () => {
    mockedFindUserByEmail.mockResolvedValue(null);

    const { req, res } = makeReqRes('POST', { email: USER.email, password: 'correct' });
    await handler(req, res);

    expect(mockedFindUserByEmail).toHaveBeenCalledWith(USER.email);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 401, message: 'Invalid email or password' });
  });

  it('returns 401 Unauthorized when password is incorrect', async () => {
    mockedFindUserByEmail.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(false);

    const { req, res } = makeReqRes('POST', { email: USER.email, password: 'wrong' });
    await handler(req, res);

    expect(mockedFindUserByEmail).toHaveBeenCalledWith(USER.email);
    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 401, message: 'Invalid email or password' });
  });

  it('returns 200 OK with token and user on successful login', async () => {
    mockedFindUserByEmail.mockResolvedValue(USER);
    mockBcryptCompare.mockResolvedValue(true);
    mockedCreateUserSession.mockResolvedValue({});

    const { req, res } = makeReqRes('POST', { email: USER.email, password: 'correct' }, 'https://example.com');
    await handler(req, res);

    expect(mockedFindUserByEmail).toHaveBeenCalledWith(USER.email);
    expect(mockedCreateUserSession).toHaveBeenCalledWith(USER.user_id);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toBe('Login successful');
    expect(payload.data.token).toBeDefined();
    expect(() => jwt.verify(payload.data.token, process.env.JWT_SECRET!)).not.toThrow();
    expect(payload.data.user).toMatchObject({
      userId: USER.user_id,
      email: USER.email,
      username: USER.username,
      displayName: 'Test User',
      userRole: USER.user_role,
    });
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });
});