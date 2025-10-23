import type { VercelRequest, VercelResponse } from '@vercel/node';

process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

jest.mock('../../../services/PasswordResetService', () => ({
  PasswordResetService: {
    requestPasswordReset: jest.fn(),
    verifyTokenAndResetPassword: jest.fn(),
  },
}));

import handler from '../../../api/auth/password.Reset';
import { PasswordResetService } from '../../../services/PasswordResetService';

const mockRequestReset = PasswordResetService.requestPasswordReset as jest.Mock;
const mockVerifyAndReset = PasswordResetService.verifyTokenAndResetPassword as jest.Mock;

function makeReqRes(method: string, body?: any, origin?: string): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    body,
    headers: origin ? { origin } as any : {},
    url: '/api/auth/reset-password',
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

describe('Password Reset API', () => {
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

  it('returns 400 Request body is required when request body is missing', async () => {
    const { req, res } = makeReqRes('POST', undefined);
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Request body is required');
    expect(payload.error).toBeUndefined();
  });

  it('returns 400 Validation failed for invalid action', async () => {
    const { req, res } = makeReqRes('POST', { email: 'user@example.com', action: 'bad-action' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toContain('Invalid action. Must be "request-reset" or "verify-token"');
  });

  it('request-reset returns 200 with success message', async () => {
    mockRequestReset.mockResolvedValue({ success: true, message: 'Email sent successfully', statusCode: 200 });

    const { req, res } = makeReqRes('POST', { email: 'user@example.com', action: 'request-reset' }, 'https://example.com');
    await handler(req, res);

    expect(mockRequestReset).toHaveBeenCalledWith('user@example.com');
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, statusCode: 200, message: 'Email sent successfully' });
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
  });

  it('returns 500 Internal server error when service throws during request-reset', async () => {
    mockRequestReset.mockRejectedValue(new Error('boom'));

    const { req, res } = makeReqRes('POST', { email: 'user@example.com', action: 'request-reset' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 500, message: 'Internal server error' });
  });

  it('request-reset returns 500 on service failure', async () => {
    mockRequestReset.mockResolvedValue({ success: false, message: 'Failed to send email', statusCode: 500 });

    const { req, res } = makeReqRes('POST', { email: 'user@example.com', action: 'request-reset' });
    await handler(req, res);

    expect(mockRequestReset).toHaveBeenCalledWith('user@example.com');
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 500, message: 'Failed to send email' });
  });

  it('verify-token returns 200 on successful password reset', async () => {
    mockVerifyAndReset.mockResolvedValue({ success: true, message: 'Password reset successful', statusCode: 200 });

    const { req, res } = makeReqRes('POST', {
      email: 'user@example.com',
      action: 'verify-token',
      token: 'ABC12345',
      newPassword: 'ValidPass1',
    });
    await handler(req, res);

    expect(mockVerifyAndReset).toHaveBeenCalledWith('user@example.com', 'ABC12345', 'ValidPass1');
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: true, statusCode: 200, message: 'Password reset successful' });
  });

  it('verify-token returns 400 on invalid or expired token', async () => {
    mockVerifyAndReset.mockResolvedValue({ success: false, message: 'Invalid or expired reset code', statusCode: 400 });

    const { req, res } = makeReqRes('POST', {
      email: 'user@example.com',
      action: 'verify-token',
      token: 'BADCODE',
      newPassword: 'ValidPass1',
    });
    await handler(req, res);

    expect(mockVerifyAndReset).toHaveBeenCalledWith('user@example.com', 'BADCODE', 'ValidPass1');
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 400, message: 'Invalid or expired reset code' });
  });

  it('verify-token returns 400 Validation failed when token/newPassword missing', async () => {
    const { req, res } = makeReqRes('POST', { email: 'user@example.com', action: 'verify-token', token: '', newPassword: '' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toContain('Token is required for verify-token action');
    expect(payload.error).toContain('New password is required for verify-token action');
  });
});