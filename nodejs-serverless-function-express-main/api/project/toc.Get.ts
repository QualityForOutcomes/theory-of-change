import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseUtils } from '../../services/utils/ResponseUtils';
import { CorsUtils } from '../../services/utils/CorsUtils';
import { ProjectService } from '../../services/ProjectService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    CorsUtils.setCors(res);
    if (CorsUtils.handleOptions(req, res)) return;

    if (req.method !== 'GET') {
        return ResponseUtils.send(res, ResponseUtils.error('Method not allowed', 405));
    }

    try {
        const { userId, projectId, type, status, limit = 10, page = 1 } = req.query;

        // Validate required parameters
        if (!userId || typeof userId !== 'string') {
            return ResponseUtils.send(res, ResponseUtils.error('userId is required', 400));
        }

        let projects = [];

        // If projectId is provided, get specific project
        if (projectId && typeof projectId === 'string') {
            const project = await ProjectService.getProjectById(userId, projectId);
            if (!project) {
                return ResponseUtils.send(res, ResponseUtils.error('Project not found', 404));
            }
            projects = [project];
        } else {
            // Get all projects for the user
            projects = await ProjectService.listUserProjects(userId);
        }

        // Apply filters
        if (type && typeof type === 'string') {
            projects = projects.filter(project => project.type === type);
        }

        if (status && typeof status === 'string') {
            projects = projects.filter(project => project.status === status);
        }

        // Sort by created_at descending (most recent first)
        projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Apply pagination
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;

        const paginatedProjects = projects.slice(startIndex, endIndex);
        const totalProjects = projects.length;

        return ResponseUtils.send(res, ResponseUtils.success({
            projects: paginatedProjects,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalProjects,
                totalPages: Math.ceil(totalProjects / limitNum)
            }
        }, 'Projects retrieved successfully'));

    } catch (err) {
        console.error('API Error:', err);
        return ResponseUtils.send(res, ResponseUtils.error('Failed to retrieve projects', 500));
    }
}