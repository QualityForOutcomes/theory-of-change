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

import handler from '../../../api/project/Create';
import { ProjectService } from '../../../services/ProjectService';

const mockedCreateProject = ProjectService.createProject as jest.Mock;

function makeReqRes(method: string = 'POST', body: any = {}, headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    headers,
    url: '/api/project/create',
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

const CREATED_PROJECT = {
  projectId: '1',
  status: 'draft',
  type: 'project',
  createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  tocData: {
    projectTitle: 'My Project',
    bigPictureGoal: null,
    projectAim: null,
    objectives: null,
    beneficiaries: null,
    activities: null,
    outcomes: null,
    externalFactors: null,
    evidenceLinks: null,
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

describe('api/project/Create handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 Created when project is created successfully', async () => {
    mockedCreateProject.mockResolvedValue(CREATED_PROJECT);

    const body = { projectTitle: 'My Project' };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedCreateProject).toHaveBeenCalledWith(expect.objectContaining({ projectTitle: 'My Project', userId: '1' }));

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      success: true,
      message: 'Project created and saved to MongoDB',
      statusCode: 201,
      data: CREATED_PROJECT,
    });
  });

  it('returns 400 when projectTitle missing (validator)', async () => {
    const body = { /* no projectTitle */ };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedCreateProject).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['projectTitle is required']));
  });

  it('returns 400 for too-long projectTitle (field format)', async () => {
    const longTitle = 'A'.repeat(201);
    const body = { projectTitle: longTitle };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['projectTitle must not exceed 200 characters']));
  });

  it('returns 400 for invalid evidenceLinks URL', async () => {
    const body = { projectTitle: 'My Project', evidenceLinks: ['not-a-url'] };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Validation failed');
    expect(payload.error).toEqual(expect.arrayContaining(['evidenceLinks[0] must be a valid URL']));
  });

  it('maps service "duplicate" error to 409', async () => {
    mockedCreateProject.mockRejectedValue(new Error('duplicate key'));

    const body = { projectTitle: 'My Project' };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(409);
  });

  it('sets CORS headers default when no origin', async () => {
    mockedCreateProject.mockResolvedValue(CREATED_PROJECT);
    const body = { projectTitle: 'My Project' };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('sets CORS headers using allowed origin', async () => {
    mockedCreateProject.mockResolvedValue(CREATED_PROJECT);
    const body = { projectTitle: 'My Project' };
    const { req, res } = makeReqRes('POST', body, { authorization: makeAuthHeader(), origin: 'http://localhost:3001' } as any);
    (req as any).headers = { ...req.headers, origin: 'http://localhost:3001' };
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3001');
  });

  it('handles OPTIONS preflight', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Method not allowed');
    expect(payload.success).toBe(false);
  });

  it('returns 401 when token missing', async () => {
    const { req, res } = makeReqRes('POST', { projectTitle: 'My Project' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'No token provided', statusCode: 401 });
  });

  it('returns 401 for invalid token', async () => {
    const { req, res } = makeReqRes('POST', { projectTitle: 'My Project' }, { authorization: 'Bearer invalid' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'Invalid token', statusCode: 401 });
  });
});