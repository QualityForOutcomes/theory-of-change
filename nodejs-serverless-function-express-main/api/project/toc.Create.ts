// ================================================================
// CREATE API Handler
// ================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseUtils } from '../../services/utils/ResponseUtils';
import { CorsUtils } from '../../services/utils/CorsUtils';
import ValidationUtils from '../../services/utils/ValidationUtils';
import { ProjectService } from '../../services/ProjectService';
import { CreateProjectRequest } from '../../services/entities/CreateProjectRequest'

export default async function createHandler(req: VercelRequest, res: VercelResponse) {
    CorsUtils.setCors(res);
    if (CorsUtils.handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return ResponseUtils.send(res, ResponseUtils.error('Method not allowed', 405));
    }

    try {
        const requestData: CreateProjectRequest = req.body;

        // Validate mandatory fields for CREATE (only userId and projectTitle required)
        const mandatoryErrors = ProjectService.validateCreateRequest(requestData);
        if (mandatoryErrors.length > 0) {
            return ResponseUtils.send(res, ResponseUtils.error(
                'Missing mandatory fields',
                400,
                mandatoryErrors
            ));
        }

        // Validate field formats and types (for provided fields only)
        const formatErrors = ValidationUtils.validateProjectForCreate(requestData);
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

        // Create project using service
        const result = await ProjectService.createProject(requestData);

        // Return success response
        return ResponseUtils.send(res, ResponseUtils.success(
            result,
            'Project created and saved to MongoDB',
            201
        ));

    } catch (err) {
        console.error('Create Project API Error:', err);

        // Handle specific error types
        let statusCode = 500;
        let errorMessage = 'Failed to create project';

        if (err instanceof Error) {
            errorMessage = err.message;

            // Customize status codes based on error types
            if (err.message.includes('Validation') || err.message.includes('required')) {
                statusCode = 400;
            } else if (err.message.includes('not found') || err.message.includes('access denied')) {
                statusCode = 404;
            } else if (err.message.includes('Database error')) {
                statusCode = 500;
            }
        }

        return ResponseUtils.send(res, ResponseUtils.error(errorMessage, statusCode));
    }
}