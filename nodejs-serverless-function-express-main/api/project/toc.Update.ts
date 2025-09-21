import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseUtils } from '../../services/utils/ResponseUtils';
import { CorsUtils } from '../../services/utils/CorsUtils';
import ValidationUtils from '../../services/utils/ValidationUtils';
import { ProjectService } from '../../services/ProjectService';
import { UpdateProjectRequest } from '../../services/entities/UpdateProjectRequest'

export default async function updateHandler(req: VercelRequest, res: VercelResponse) {
    CorsUtils.setCors(res);
    if (CorsUtils.handleOptions(req, res)) return;

    if (req.method !== 'PUT') {
        return ResponseUtils.send(res, ResponseUtils.error('Method not allowed', 405));
    }

    try {
        const requestData: UpdateProjectRequest = req.body;

        // Validate mandatory fields for UPDATE (userId, projectId, projectTitle required)
        const mandatoryErrors = ProjectService.validateUpdateRequest(requestData);
        if (mandatoryErrors.length > 0) {
            return ResponseUtils.send(res, ResponseUtils.error(
                'Missing mandatory fields',
                400,
                mandatoryErrors
            ));
        }

        // Validate field formats and types (for provided fields only)
        const formatErrors = ValidationUtils.validateProjectForUpdate(requestData);
        if (formatErrors.length > 0) {
            return ResponseUtils.send(res, ResponseUtils.error(
                'Validation failed',
                400,
                formatErrors
            ));
        }

        // Additional format validation
        const fieldFormatErrors = ValidationUtils.validateFieldFormats(requestData);
        if (fieldFormatErrors.length > 0) {
            return ResponseUtils.send(res, ResponseUtils.error(
                'Field format validation failed',
                400,
                fieldFormatErrors
            ));
        }

        // Update project using service
        const result = await ProjectService.updateProject(requestData);

        // Return success response
        return ResponseUtils.send(res, ResponseUtils.success(
            result,
            'Project updated in both database and blob storage',
            200
        ));

    } catch (err) {
        console.error('Update Project API Error:', err);

        // Handle specific error types
        let statusCode = 500;
        let errorMessage = 'Failed to update project';

        if (err instanceof Error) {
            errorMessage = err.message;

            // Customize status codes based on error types
            if (err.message.includes('Validation') || err.message.includes('required')) {
                statusCode = 400;
            } else if (err.message.includes('not found') || err.message.includes('access denied')) {
                statusCode = 404;
            } else if (err.message.includes('Database') || err.message.includes('Ownership validation')) {
                statusCode = 500;
            }
        }

        return ResponseUtils.send(res, ResponseUtils.error(errorMessage, statusCode));
    }
}