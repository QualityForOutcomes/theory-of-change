/**
 * Password Reset API Endpoint
 * 
 * Handles password reset operations including:
 * - Requesting a password reset (sends reset token via email)
 * - Verifying reset token and updating password
 * 
 * @route POST /api/auth/reset-password
 * @access Public
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { PasswordResetService } from '../../services/PasswordResetService';
import { PasswordResetRequest } from '../../entities/auth/PasswordResetRequest';

/**
 * Handles password reset requests and token verification
 * 
 * Process:
 * 1. Validates request body
 * 2. Routes to appropriate action (request-reset or verify-token)
 * 3. For request-reset: Generates reset token and sends email
 * 4. For verify-token: Validates token and updates password
 * 5. Returns success/error response
 * 
 * @param req - Request containing email, action, and optionally token/newPassword
 * @param res - Response object
 * @returns Success message on completion, error message on failure
 */
const resetPassword = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
        console.log("req.body: ", req.body);

        if (!req.body) {
            ResponseUtils.send(res, ResponseUtils.error('Request body is required', 400));
            return;
        }

        const { email, action, token, newPassword }: PasswordResetRequest = req.body;

        // Handle password reset request action - sends reset email with token
        if (action === 'request-reset') {
            const result = await PasswordResetService.requestPasswordReset(email);
            ResponseUtils.send(res, result.success
                ? ResponseUtils.success({}, result.message, result.statusCode)
                : ResponseUtils.error(result.message, result.statusCode)
            );
            return;
        }

        // Handle token verification and password reset action
        if (action === 'verify-token') {
            if (!token || !newPassword) {
                ResponseUtils.send(res, ResponseUtils.error('Token and new password are required', 400));
                return;
            }

            const result = await PasswordResetService.verifyTokenAndResetPassword(email, token, newPassword);
            ResponseUtils.send(res, result.success
                ? ResponseUtils.success({}, result.message, result.statusCode)
                : ResponseUtils.error(result.message, result.statusCode)
            );
            return;
        }

        // Invalid action provided
        ResponseUtils.send(res, ResponseUtils.error('Invalid action', 400));
    } catch (error: unknown) {
        console.error('Password reset handler error:', error);
        ResponseUtils.send(res, ResponseUtils.error('Internal server error', 500));
    }
};

// Export handler with POST method restriction and input validation
export default createHandler(resetPassword, {
    allowedMethods: ['POST'],
    validator: Validators.passwordReset
});