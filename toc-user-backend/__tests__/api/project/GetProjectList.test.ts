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

import handler from '../../../api/project/GetProjectList';
import { ProjectService } from '../../../services/ProjectService';

const mockedListUserProjects = ProjectService.listUserProjects as jest.Mock;

function makeReqRes(method: string = 'GET', headers: Record<string, string> = {}): { req: VercelRequest; res: VercelResponse } {
  const req = {
    method,
    headers,
    url: '/api/project/list',
    query: {},
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

const PROJECTS = [
  { projectId: 'p-1', tocData: { projectTitle: 'Beta' } },
  { projectId: 'p-2', tocData: { projectTitle: 'Alpha' } },
  { projectId: 'p-3', tocData: { projectTitle: '' } },
];

describe('api/project/GetProjectList handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 OK with sorted project list and count', async () => {
    mockedListUserProjects.mockResolvedValue(PROJECTS);

    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(mockedListUserProjects).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];

    expect(payload.message).toBe('Project list retrieved successfully');
    // Sorted alphabetically by projectName: Alpha, Beta, Project 3
    expect(payload.data.projects.map((p: any) => p.projectName)).toEqual(['Alpha', 'Beta', 'Project 3']);
    expect(payload.data.projects.map((p: any) => p.projectId)).toEqual(['p-2', 'p-1', 'p-3']);
    expect(payload.data.count).toBe(3);
  });

  it('sets CORS headers default when no origin', async () => {
    mockedListUserProjects.mockResolvedValue(PROJECTS);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('sets CORS headers using allowed origin', async () => {
    mockedListUserProjects.mockResolvedValue(PROJECTS);
    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader(), origin: 'http://localhost:3001' } as any);
    (req as any).headers = { ...req.headers, origin: 'http://localhost:3001' };
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3001');
  });

  it('handles OPTIONS preflight', async () => {
    const { req, res } = makeReqRes('OPTIONS');
    await handler(req, res);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockedListUserProjects).not.toHaveBeenCalled();
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = makeReqRes('POST', { authorization: makeAuthHeader() });
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
    const { req, res } = makeReqRes('GET', { authorization: 'Bearer invalid' });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ success: false, error: 'Invalid token', statusCode: 401 });
  });

  it('maps unexpected service error to 500', async () => {
    mockedListUserProjects.mockRejectedValue(new Error('database down'));

    const { req, res } = makeReqRes('GET', { authorization: makeAuthHeader() });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
  });
});