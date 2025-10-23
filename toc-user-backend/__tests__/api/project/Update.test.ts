import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

jest.mock('../../../services/ProjectService', () => ({
  ProjectService: {
    createProject: jest.fn(),
    updateProject: jest.fn(),
    listUserProjects: jest.fn(),
    getProjectById: jest.fn(),
  },
}));

import handler from '../../../api/project/Update';
import { ProjectService } from '../../../services/ProjectService';

const mockedUpdateProject = ProjectService.updateProject as jest.Mock;

function makeReqRes(method: string = 'PUT', body: any = {}, headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    headers,
    url: '/api/project/update',
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

function makeAuthHeader(email: string = 'user@example.com', userId: number = 1): string {
  const token = jwt.sign({ email, userId, sub: String(userId) }, process.env.JWT_SECRET!);
  return `Bearer ${token}`;
}

const UPDATED_PROJECT = {
  projectId: 'p-1',
  status: 'active',
  type: 'project',
  createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-06-01T00:00:00.000Z').toISOString(),
  tocData: {
    projectTitle: 'Updated Title',
    bigPictureGoal: 'Goal',
    projectAim: 'Aim',
    objectives: [],
    beneficiaries: null,
    activities: [],
    outcomes: [],
    externalFactors: [],
    evidenceLinks: ['http://example.com/evidence'],
  },
  tocColor: {
    bigPictureGoal: { shape: '', text: '' },
    projectAim: { shape: '', text: '' },
    activities: { shape: '', text: '' },
    objectives: { shape: '', text: '' },
    beneficiaries: { shape: '', text: '' },
    outcomes: { shape: '', text: '' },
    externalFactors: { shape: '', text: '' },
    evidenceLinks: { shape: '', text: '' },
  },
};

describe('api/project/Update handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 OK when project updated successfully', async () => {
    mockedUpdateProject.mockResolvedValue(UPDATED_PROJECT);

    const body = { projectId: 'p-1', projectTitle: 'Updated Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedUpdateProject).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p-1', projectTitle: 'Updated Title', userId: '1' }));

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      success: true,
      message: 'Project updated successfully',
      statusCode: 200,
      data: UPDATED_PROJECT,
    });
  });

  it('returns 400 when projectId missing (validator)', async () => {
    const body = { projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedUpdateProject).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['projectId is required and must be a string']));
  });

  it('returns 400 when projectTitle missing (validator)', async () => {
    const body = { projectId: 'p-1' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedUpdateProject).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['projectTitle is required and must be a string']));
  });

  it('returns 400 for too-long projectTitle (field format)', async () => {
    const longTitle = 'A'.repeat(201);
    const body = { projectId: 'p-1', projectTitle: longTitle };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['projectTitle must not exceed 200 characters']));
  });

  it('returns 400 for invalid evidenceLinks URL', async () => {
    const body = { projectId: 'p-1', projectTitle: 'Title', evidenceLinks: ['bad-url'] };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['evidenceLinks[0] must be a valid URL']));
  });

  it('maps service "duplicate" error to 409', async () => {
    mockedUpdateProject.mockRejectedValue(new Error('duplicate key'));

    const body = { projectId: 'p-1', projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(409);
  });

  it('maps service "not found" error to 404', async () => {
    mockedUpdateProject.mockRejectedValue(new Error('project not found'));

    const body = { projectId: 'missing', projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(404);
  });

  it('maps unexpected service error to 500', async () => {
    mockedUpdateProject.mockRejectedValue(new Error('database timeout'));

    const body = { projectId: 'p-1', projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
  });

  it('sets CORS headers default when no origin', async () => {
    mockedUpdateProject.mockResolvedValue(UPDATED_PROJECT);
    const body = { projectId: 'p-1', projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('sets CORS headers using allowed origin', async () => {
    mockedUpdateProject.mockResolvedValue(UPDATED_PROJECT);
    const body = { projectId: 'p-1', projectTitle: 'Title' };
    const { req, res } = makeReqRes('PUT', body, { authorization: makeAuthHeader(), origin: 'http://localhost:3001' } as any);
    (req as any).headers = { ...req.headers, origin: 'http://localhost:3001' };
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3001');
  });

  it('handles OPTIONS preflight', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockedUpdateProject).not.toHaveBeenCalled();
  });

  it('returns 405 for non-PUT methods', async () => {
    const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Method not allowed');
    expect(payload.success).toBe(false);
  });

  it('returns 401 when token missing', async () => {
    const { req, res } = makeReqRes('PUT', { projectId: 'p-1', projectTitle: 'Title' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'No token provided', statusCode: 401 });
  });

  it('returns 401 for invalid token', async () => {
    const { req, res } = makeReqRes('PUT', { projectId: 'p-1', projectTitle: 'Title' }, { authorization: 'Bearer invalid' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'Invalid token', statusCode: 401 });
  });
});