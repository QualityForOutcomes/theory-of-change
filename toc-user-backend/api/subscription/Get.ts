/**
 * Get Subscription API Endpoint
 * 
 * Retrieves subscription data for an authenticated user.
 * Supports fetching by subscription ID or retrieving user's active subscription.
 * 
 * @route GET /api/subscription/get
 * @access Private (requires authentication)
 * @query subscriptionId - Optional: Specific subscription ID to retrieve
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import {
    getSubscriptionById,
    getUserSubscription
} from '../../services/SubscriptionService';
import { AuthenticatedRequest } from '../../middleware/Auth';

/**
 * Handles subscription retrieval for authenticated users
 * 
 * Process:
 * 1. Extracts user email from JWT token
 * 2. Checks if subscriptionId is provided in query params
 * 3. If subscriptionId exists:
 *    - Fetches subscription by ID
 *    - Verifies ownership (subscription email matches authenticated user)
 * 4. If no subscriptionId:
 *    - Fetches user's subscription by email
 * 5. Returns subscription data
 * 
 * @param req - Request with optional subscriptionId query parameter
 * @param res - Response object
 * @returns Subscription data on success, error on failure or unauthorized access
 */
const getSubscription = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    // Cast to AuthenticatedRequest since requireAuth: true ensures user exists
    const authenticatedReq = req as AuthenticatedRequest;
    const { subscriptionId } = req.query;

    try {
        let subscription;

        if (subscriptionId) {
            // Fetch subscription by specific ID
            subscription = await getSubscriptionById(subscriptionId as string);

            if (!subscription) {
                ResponseUtils.send(res, ResponseUtils.notFound('Subscription not found'));
                return;
            }

            // Verify subscription ownership - ensure user can only access their own subscription
            if (subscription.email.toLowerCase() !== authenticatedReq.user.email.toLowerCase()) {
                ResponseUtils.send(res, ResponseUtils.forbidden('You do not have access to this subscription'));
                return;
            }
        } else {
            // Fetch user's subscription by email from JWT token
            const userEmail = authenticatedReq.user.email;
            subscription = await getUserSubscription(userEmail);
        }

        ResponseUtils.send(res, ResponseUtils.success(subscription, 'Subscription retrieved successfully'));
    } catch (error: unknown) {
        console.error('Error retrieving subscription:', error);
        ResponseUtils.send(res, ResponseUtils.serverError('Failed to retrieve subscription'));
    }
};

// Export handler with authentication requirement and GET method restriction
export default createHandler(getSubscription, {
    allowedMethods: ['GET'],
    requireAuth: true
});