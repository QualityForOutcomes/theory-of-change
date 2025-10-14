//// api/subscription/Update.ts
//import type { VercelRequest, VercelResponse } from '@vercel/node';
//import { createHandler } from '../../services/utils/HandlerFactory';
//import { ResponseUtils } from '../../services/utils/ResponseUtils';
//import { updateExistingSubscription } from '../../services/SubscriptionService';

//const updateSubscription = async (req: VercelRequest, res: VercelResponse) => {
//    const { subscriptionId, status, planId, renewalDate, expiresAt, autoRenew } = req.body;

//    const subscription = await updateExistingSubscription(subscriptionId, {
//        status,
//        planId,
//        renewalDate,
//        expiresAt,
//        autoRenew
//    });

//    ResponseUtils.send(res, ResponseUtils.success(subscription, 'Subscription updated successfully'));
//};

//export default createHandler(updateSubscription, {
//    allowedMethods: ['PUT'],
//    requireAuth: true
//});