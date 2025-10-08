/**
 * Create Project API Endpoint
 * 
 * Creates a new project for an authenticated user.
 * Validates project data and stores it in MongoDB.
 * 
 * @route POST /api/project/create
 * @access Private (requires authentication)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import ValidationUtils from '../../validators/ValidationUtils';
import { ProjectService } from '../../services/ProjectService';
import { AuthenticatedRequest } from '../../middleware/Auth';
import ProjectData from "../../entities/project/ProjectData";

/**
 * Handles project creation for authenticated users
 * 
 * Process:
 * 1. Extracts project data from request body
 * 2. Associates project with authenticated user
 * 3. Validates field formats (e.g., dates, URLs, emails)
 * 4. Validates project-specific business rules
 * 5. Creates project in MongoDB via ProjectService
 * 6. Returns created project data
 * 
 * @param req - Authenticated request containing project data in body
 * @param res - Response object
 * @returns Created project data on success, validation errors on failure
 */
const createProject = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    const requestData = req.body;

    // Associate project with authenticated user
    requestData.userId = req.user.userId.toString();

    // Validate field formats (dates, emails, URLs, etc.)
    const fieldErrors = ValidationUtils.validateFieldFormats(requestData);
    if (fieldErrors.length > 0) {
        ResponseUtils.send(res, ResponseUtils.validationError(fieldErrors));
        return;
    }

    // Validate project-specific business rules for creation
    const projectErrors = ValidationUtils.validateProjectForCreate(requestData);
    if (projectErrors.length > 0) {
        ResponseUtils.send(res, ResponseUtils.validationError(projectErrors));
        return;
    }

    // Create project in database
    const result: ProjectData = await ProjectService.createProject(requestData);

    ResponseUtils.send(res, ResponseUtils.created(result, 'Project created and saved to MongoDB'));
};

// Export handler with authentication requirement, POST method restriction, and input validation
export default createHandler(createProject, {
    requireAuth: true,
    allowedMethods: ['POST'],
    validator: Validators.createProject
});