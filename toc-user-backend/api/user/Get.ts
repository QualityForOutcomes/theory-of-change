/**
 * Get User Profile API Endpoint
 * 
 * Retrieves the authenticated user's profile information.
 * Uses JWT token to identify and fetch user data.
 * 
 * @route GET /api/user/get
 * @access Private (requires authentication)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { getUserProfile } from '../../services/UserService';
import { AuthenticatedRequest } from '../../middleware/Auth';

/**
 * Handles user profile retrieval for authenticated users
 * 
 * Process:
 * 1. Extracts user data from JWT token
 * 2. Fetches user profile using email from token
 * 3. Validates user exists
 * 4. Returns user profile data
 * 
 * @param req - Authenticated request containing user data from JWT
 * @param res - Response object
 * @returns User profile data on success, not found error if user doesn't exist
 */
const getUser = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // Extract user credentials from JWT token
    const user = req.user;

    // Fetch user profile using authenticated email (secure)
    const userDetails = await getUserProfile(user.email);

    if (!userDetails) {
        ResponseUtils.send(res, ResponseUtils.notFound('User not found'));
        return;
    }

    ResponseUtils.send(res, ResponseUtils.success(userDetails, 'User details retrieved successfully'));
};

// Export handler with authentication requirement and GET method restriction
export default createHandler(getUser, {
    requireAuth: true,
    allowedMethods: ['GET']
});