import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { NewsletterCampaignService } from '../../services/NewsletterCampaignService';
import { exportNewsletterSubscribers } from '../../utils/supabaseUtils/NewsletterUtils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    const { subject, html, segment } = req.body || {};

    if (!subject || !html) {
        return ResponseUtils.send(res, ResponseUtils.badRequest('Subject and html are required'));
    }

    // Fetch recipients (optionally filter by segment in future)
    const recipients = await exportNewsletterSubscribers();

    if (!recipients || recipients.length === 0) {
        return ResponseUtils.send(res, ResponseUtils.success({ message: 'No subscribers to send.' }));
    }

    const result = await NewsletterCampaignService.sendCampaign(recipients, { subject, html });
    return ResponseUtils.send(res, ResponseUtils.success(result, 'Campaign dispatched'));
};

export default createHandler(handler, {
    requireAuth: true,
    allowedMethods: ['POST']
});