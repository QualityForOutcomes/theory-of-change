/**
 * Get Project List API Endpoint
 * 
 * Retrieves a simplified list of all projects for an authenticated user.
 * Returns only project IDs and names (minimal data for dropdowns/listings).
 * 
 * @route GET /api/project/list
 * @access Private (requires authentication)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { ProjectService } from '../../services/ProjectService';
import { AuthenticatedRequest } from '../../middleware/Auth';
import { ProjectListItem } from '../../entities/project/ProjectListItem';
import { ProjectListResponse } from '../../entities/project/ProjectListResponse';

/**
 * Handles retrieval of simplified project list for authenticated users
 * 
 * Process:
 * 1. Extracts user ID from JWT token
 * 2. Fetches all projects for the user
 * 3. Maps projects to minimal structure (ID and name only)
 * 4. Sorts projects alphabetically by name
 * 5. Returns sorted list with count
 * 
 * @param req - Authenticated request
 * @param res - Response object
 * @returns Simplified project list sorted alphabetically with total count
 */
const getProjectList = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // Extract user ID from JWT token
    const userId = req.user.userId.toString();

    // Fetch all projects for the authenticated user
    const projects = await ProjectService.listUserProjects(userId);

    // Map to simplified structure containing only ID and name
    const projectList : ProjectListItem[] = projects.map((project, index) => ({
        projectId: project.projectId,
        projectName: project.tocData?.projectTitle || `Project ${index + 1}`,
    }));

    // Sort projects alphabetically by name
    projectList.sort((a, b) => a.projectName.localeCompare(b.projectName));

    // Build response with project list and count
    const result: ProjectListResponse = {
        projects: projectList,
        count: projectList.length
    };

    ResponseUtils.send(res, ResponseUtils.success(result, 'Project list retrieved successfully'));
};

// Export handler with authentication requirement and GET method restriction
export default createHandler(getProjectList, {
    requireAuth: true,
    allowedMethods: ['GET']
});