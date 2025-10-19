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

import handler from '../../../api/project/Get';
import { ProjectService } from '../../../services/ProjectService';

const mockedListUserProjects = ProjectService.listUserProjects as jest.Mock;
const mockedGetProjectById = ProjectService.getProjectById as jest.Mock;

function makeReqRes(method: string = 'GET', query: any = {}, headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    headers,
    url: '/api/project/get',
    query,
    body: {},
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

const PROJECT_A = {
  projectId: 'p-1',
  status: 'active',
  type: 'project',
  createdAt: new Date('2024-02-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-06-01T00:00:00.000Z').toISOString(),
  tocData: { projectTitle: 'Alpha' },
  tocColor: {},
};

const PROJECT_B = {
  projectId: 'p-2',
  status: 'draft',
  type: 'project',
  createdAt: new Date('2024-03-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-06-01T00:00:00.000Z').toISOString(),
  tocData: { projectTitle: 'Beta' },
  tocColor: {},
};

describe('api/project/Get handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 OK for single project by ID', async () => {
    mockedGetProjectById.mockResolvedValue(PROJECT_A);

    const { req, res } = makeReqRes('GET', { projectId: 'p-1' }, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedGetProjectById).toHaveBeenCalledWith('1', 'p-1');
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Projects retrieved successfully');
    expect(payload.data.projects).toHaveLength(1);
    expect(payload.data.projects[0]).toEqual(PROJECT_A);
    expect(payload.data.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it('returns 404 when single project not found', async () => {
    mockedGetProjectById.mockResolvedValue(null);

    const { req, res } = makeReqRes('GET', { projectId: 'missing' }, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, statusCode: 404, message: 'Project not found' });
  });

  it('returns 200 OK for list with filters, sorting, and pagination', async () => {
    mockedListUserProjects.mockResolvedValue([
      PROJECT_A,
      PROJECT_B,
      { ...PROJECT_A, projectId: 'p-3', status: 'active', createdAt: new Date('2024-04-01T00:00:00.000Z').toISOString() },
      { ...PROJECT_B, projectId: 'p-4', status: 'active', createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString() },
    ]);

    const { req, res } = makeReqRes('GET', { status: 'active', type: 'project', limit: '2', page: '1' }, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedListUserProjects).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Projects retrieved successfully');
    // After filtering status=active, we have PROJECT_A, p-3, and p-4; sorted by createdAt desc: p-3 (Apr), p-1 (Feb), p-4 (Jan)
    expect(payload.data.projects).toHaveLength(2);
    expect(payload.data.projects.map((p: any) => p.projectId)).toEqual(['p-3', 'p-1']);
    expect(payload.data.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('sets CORS headers default when no origin', async () => {
    mockedListUserProjects.mockResolvedValue([PROJECT_A, PROJECT_B]);
    const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('sets CORS headers using allowed origin', async () => {
    mockedListUserProjects.mockResolvedValue([PROJECT_A, PROJECT_B]);
    const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader(), origin: 'http://localhost:3001' } as any);
    (req as any).headers = { ...req.headers, origin: 'http://localhost:3001' };
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3001');
  });

  it('handles OPTIONS preflight', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockedGetProjectById).not.toHaveBeenCalled();
    expect(mockedListUserProjects).not.toHaveBeenCalled();
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = makeReqRes('POST', {}, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe('Method not allowed');
    expect(payload.success).toBe(false);
  });

  it('returns 401 when token missing', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'No token provided', statusCode: 401 });
  });

  it('returns 401 for invalid token', async () => {
    const { req, res } = makeReqRes('GET', {}, { authorization: 'Bearer invalid' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'Invalid token', statusCode: 401 });
  });

  it('maps unexpected service error to 500', async () => {
    mockedListUserProjects.mockRejectedValue(new Error('database down'));

    const { req, res } = makeReqRes('GET', {}, { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
  });
});