import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock the UserService used by the handler
jest.mock('../../../services/UserService', () => ({
  createUser: jest.fn(),
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
}));

import handler from '../../../api/user/Create';
import { createUser, checkEmailExists, checkUsernameExists } from '../../../services/UserService';

const mockedCreateUser = createUser as jest.Mock;
const mockedCheckEmailExists = checkEmailExists as jest.Mock;
const mockedCheckUsernameExists = checkUsernameExists as jest.Mock;

// Helper to create mock req/res objects
function makeReqRes(method: string, body: any = {}): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    body,
    headers: {},
    url: '/api/user/create',
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

// Valid request body that passes Validators.userRegistration
const VALID_BODY = {
  email: 'new.user@example.com',
  password: 'StrongPass123!',
  username: 'newuser',
  firstName: 'New',
  lastName: 'User',
  organisation: 'Org',
  acceptTandC: true,
  newsLetterSubs: false,
};

const USER_RESPONSE = {
  userId: 1,
  email: 'new.user@example.com',
  username: 'newuser',
  firstName: 'New',
  lastName: 'User',
  organisation: 'Org',
  avatarUrl: '',
  displayName: 'New User',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  userRole: 'user',
};

describe('api/user/Create handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 Created when registration succeeds', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockResolvedValue(USER_RESPONSE);

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(mockedCheckEmailExists).toHaveBeenCalledWith(VALID_BODY.email);
    expect(mockedCheckUsernameExists).toHaveBeenCalledWith(VALID_BODY.username);
    expect(mockedCreateUser).toHaveBeenCalledWith(VALID_BODY);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      success: true,
      message: 'User registered successfully',
      statusCode: 201,
      data: USER_RESPONSE,
    });
  });

  it('returns 409 Conflict when email already exists', async () => {
    mockedCheckEmailExists.mockResolvedValue(true);

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      success: false,
      message: 'Email already registered',
      statusCode: 409,
    });
  });

  it('returns 409 Conflict when username already taken', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(true);

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      success: false,
      message: 'Username already taken',
      statusCode: 409,
    });
  });

  it('returns 400 Bad Request with validation errors for invalid input', async () => {
    const invalidBody = { email: 'invalid', password: 'weak' };
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    // Should fail before hitting services
    expect(mockedCheckEmailExists).not.toHaveBeenCalled();
    expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe('Validation failed');
    expect(Array.isArray(payload.error)).toBe(true);
    // Validator returns detailed messages; check a couple likely ones
    expect(payload.error).toEqual(
      expect.arrayContaining([
        'Valid email is required',
        'Password must be at least 8 characters long',
      ])
    );
  });

  it('returns 400 Bad Request when password missing', async () => {
    const invalidBody = { email: 'user@example.com' };
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    expect(mockedCheckEmailExists).not.toHaveBeenCalled();
    expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toEqual(expect.arrayContaining(['Password is required']));
  });

  it('returns 400 when password lacks uppercase', async () => {
    const invalidBody = { ...VALID_BODY, password: 'lowercase123' };
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toEqual(expect.arrayContaining(['Password must contain at least one uppercase letter']));
  });

  it('returns 400 when password lacks lowercase', async () => {
    const invalidBody = { ...VALID_BODY, password: 'UPPERCASE123' };
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toEqual(expect.arrayContaining(['Password must contain at least one lowercase letter']));
  });

  it('returns 400 when password lacks a number', async () => {
    const invalidBody = { ...VALID_BODY, password: 'NoNumberPass' };
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toEqual(expect.arrayContaining(['Password must contain at least one number']));
  });

  it('returns 400 when email is missing', async () => {
    const invalidBody = { ...VALID_BODY };
    delete (invalidBody as any).email;
    const { req, res } = makeReqRes('POST', invalidBody);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toEqual(expect.arrayContaining(['Valid email is required']));
  });

  it('does not check username when username is undefined', async () => {
    const bodyWithoutUsername = { ...VALID_BODY };
    delete (bodyWithoutUsername as any).username;

    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCreateUser.mockResolvedValue(USER_RESPONSE);

    const { req, res } = makeReqRes('POST', bodyWithoutUsername);
    await handler(req, res);

    expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('does not check username when username is empty string', async () => {
    const bodyEmptyUsername = { ...VALID_BODY, username: '' };

    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCreateUser.mockResolvedValue(USER_RESPONSE);

    const { req, res } = makeReqRes('POST', bodyEmptyUsername);
    await handler(req, res);

    expect(mockedCheckUsernameExists).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sets CORS headers with default origin when none provided', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockResolvedValue(USER_RESPONSE);

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('sets CORS headers using request origin', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockResolvedValue(USER_RESPONSE);

    const { req, res } = makeReqRes('POST', VALID_BODY);
      (req as any).headers = { origin: 'http://localhost:3000' };
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
  });

  it('maps service "already exists" error to 409', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockRejectedValue(new Error('User already exists'));

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('User already exists');
  });

  it('maps service "not found" error to 404', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockRejectedValue(new Error('Profile not found'));

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Profile not found');
  });

  it('maps service "required" error to 400', async () => {
    mockedCheckEmailExists.mockResolvedValue(false);
    mockedCheckUsernameExists.mockResolvedValue(false);
    mockedCreateUser.mockRejectedValue(new Error('Terms and conditions required'));

    const { req, res } = makeReqRes('POST', VALID_BODY);
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Terms and conditions required');
  });
  it('returns 405 Method Not Allowed for non-POST methods', async () => {
    const { req, res } = makeReqRes('GET');
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
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  //it('returns 500 on unexpected service error', async () => {
  //  mockedCheckEmailExists.mockResolvedValue(false);
  //  mockedCheckUsernameExists.mockResolvedValue(false);
  //  mockedCreateUser.mockRejectedValue(new Error('Unexpected failure'));

  //  const { req, res } = makeReqRes('POST', VALID_BODY);
  //  await handler(req, res);

  //  expect(res.status).toHaveBeenCalledWith(500);
  //  const payload = (res.json as jest.Mock).mock.calls[0][0];
  //  expect(payload.success).toBe(false);
  //  expect(payload.statusCode).toBe(500);
  //});
});