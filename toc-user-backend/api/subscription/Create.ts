/**
 * Create Subscription API Endpoint
 * 
 * Creates or updates a subscription for a user.
 * Associates user with a pricing plan and sets subscription parameters.
 * 
 * @route POST /api/subscription/create
 * @access Private (requires authentication)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { createOrUpdateSubscription } from '../../services/SubscriptionService';
import { CreateSubscriptionRequest } from '../../entities/subscription/SubscriptionData';

/**
 * Handles subscription creation or update for authenticated users
 * 
 * Process:
 * 1. Extracts subscription data from request body
 * 2. Validates plan existence
 * 3. Creates or updates subscription in database
 * 4. Returns created/updated subscription data
 * 5. Handles plan not found errors
 * 
 * @param req - Request containing subscription data in body
 * @param res - Response object
 * @returns Created subscription data on success, error on failure
 */
const createSubscription = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const {
        subscriptionId,
        email,
        planId,
        status,
        startDate,
        renewalDate,
        expiresAt,
        autoRenew
    }: CreateSubscriptionRequest & { subscriptionId?: string } = req.body;

    try {
        // Create or update subscription with provided data
        const subscription = await createOrUpdateSubscription({
            subscriptionId,
            email,
            planId,
            status,
            startDate,
            renewalDate,
            expiresAt,
            autoRenew
        });

        ResponseUtils.send(res, ResponseUtils.created(subscription, 'Subscription created successfully'));
    } catch (error: unknown) {
        // Handle specific error cases
        if (error instanceof Error && error.message === 'PLAN_NOT_FOUND') {
            ResponseUtils.send(res, ResponseUtils.notFound('Plan not found'));
            return;
        }
        throw error;
    }
};

// Export handler with authentication requirement and POST method restriction
export default createHandler(createSubscription, {
    allowedMethods: ['POST'],
    requireAuth: true
});