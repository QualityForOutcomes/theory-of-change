/**
 * Get Project(s) API Endpoint
 * 
 * Retrieves projects for an authenticated user.
 * Supports fetching a single project by ID or listing all user projects
 * with optional filtering, sorting, and pagination.
 * 
 * @route GET /api/project/get
 * @access Private (requires authentication)
 * @query projectId - Optional: Specific project ID to retrieve
 * @query type - Optional: Filter by project type
 * @query status - Optional: Filter by project status
 * @query limit - Optional: Number of results per page (default: 10)
 * @query page - Optional: Page number for pagination (default: 1)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { ProjectService } from '../../services/ProjectService';
import { AuthenticatedRequest } from '../../middleware/Auth';
import ProjectData from "../../entities/project/ProjectData";

/**
 * Handles project retrieval for authenticated users
 * 
 * Process:
 * 1. Extracts user ID from JWT token
 * 2. Parses query parameters (projectId, type, status, limit, page)
 * 3. Fetches specific project by ID or lists all user projects
 * 4. Applies type and status filters if provided
 * 5. Sorts projects by creation date (newest first)
 * 6. Applies pagination
 * 7. Returns paginated project list with metadata
 * 
 * @param req - Authenticated request with query parameters
 * @param res - Response object
 * @returns Paginated project list with metadata on success, error on failure
 */
const getProject = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // Extract user credentials from JWT token
    const userId = req.user.userId.toString();
    const email = req.user.email;
    const { projectId, type, status, limit = 10, page = 1 } = req.query;

    console.log("userId: ", userId);
    console.log("email: ", email);

    let projects: ProjectData[] = [];

    // Fetch specific project by ID or retrieve all user projects
    if (projectId && typeof projectId === 'string') {
        const project = await ProjectService.getProjectById(userId, projectId);
        if (!project) {
            ResponseUtils.send(res, ResponseUtils.notFound('Project not found'));
            return;
        }
        projects = [project];
    } else {
        projects = await ProjectService.listUserProjects(userId);
    }

    // Apply type filter if provided
    if (type && typeof type === 'string') {
        projects = projects.filter(project => project.type === type);
    }

    // Apply status filter if provided
    if (status && typeof status === 'string') {
        projects = projects.filter(project => project.status === status);
    }

    // Sort projects by creation date descending (most recent first)
    projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate pagination indices
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    // Apply pagination to filtered and sorted results
    const paginatedProjects = projects.slice(startIndex, endIndex);
    const totalProjects = projects.length;

    // Build response with pagination metadata
    const result = {
        projects: paginatedProjects,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalProjects,
            totalPages: Math.ceil(totalProjects / limitNum)
        }
    };

    ResponseUtils.send(res, ResponseUtils.success(result, 'Projects retrieved successfully'));
};

// Export handler with authentication requirement and GET method restriction
export default createHandler(getProject, {
    requireAuth: true,
    allowedMethods: ['GET']
});