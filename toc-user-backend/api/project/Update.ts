/**
 * Update Project API Endpoint
 * 
 * Updates an existing project for an authenticated user.
 * Validates project data and updates it in MongoDB.
 * 
 * @route PUT /api/project/update
 * @access Private (requires authentication)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import ValidationUtils from '../../validators/ValidationUtils';
import { ProjectService } from '../../services/ProjectService';
import { AuthenticatedRequest } from '../../middleware/Auth';

/**
 * Handles project updates for authenticated users
 * 
 * Process:
 * 1. Extracts user ID from JWT token
 * 2. Merges user ID with request data
 * 3. Validates project-specific update rules
 * 4. Validates field formats (dates, URLs, emails, etc.)
 * 5. Updates project in MongoDB via ProjectService
 * 6. Returns updated project data
 * 
 * @param req - Authenticated request containing project update data in body
 * @param res - Response object
 * @returns Updated project data on success, validation errors on failure
 */
const updateProject = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // Extract user ID from JWT token
    const userId = req.user.userId.toString();
    const requestData = req.body;

    // Associate update with authenticated user
    const projectData = {
        ...requestData,
        userId: userId
    };

    // Validate project-specific business rules for updates
    const formatErrors = ValidationUtils.validateProjectForUpdate(projectData);
    if (formatErrors.length > 0) {
        ResponseUtils.send(res, ResponseUtils.validationError(formatErrors));
        return;
    }

    // Validate field formats (dates, emails, URLs, etc.)
    const fieldFormatErrors = ValidationUtils.validateFieldFormats(projectData);
    if (fieldFormatErrors.length > 0) {
        ResponseUtils.send(res, ResponseUtils.validationError(fieldFormatErrors));
        return;
    }

    // Update project in database
    const result = await ProjectService.updateProject(projectData);

    ResponseUtils.send(res, ResponseUtils.updated(result, 'Project updated successfully'));
};

// Export handler with authentication requirement, PUT method restriction, and input validation
export default createHandler(updateProject, {
    requireAuth: true,
    allowedMethods: ['PUT'],
    validator: Validators.updateProject
});