import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY as string;
const NEWSLETTER_FROM_EMAIL = (process.env.NEWSLETTER_FROM_EMAIL || process.env.GMAIL_USER) as string;
const NEWSLETTER_FROM_NAME = (process.env.NEWSLETTER_FROM_NAME || process.env.GMAIL_SENDER_NAME || 'Quality for Outcomes') as string;

if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not set; NewsletterCampaignService will not send emails.');
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface NewsletterCampaign {
    subject: string;
    html: string;
}

export class NewsletterCampaignService {
    /**
     * Sends a newsletter campaign email to a list of recipients.
     * Uses SendGrid for high deliverability and proper rate limiting.
     * Batches recipients to avoid provider limits.
     */
    static async sendCampaign(recipients: string[], campaign: NewsletterCampaign): Promise<{ total: number; sent: number; failed: number; failures: string[]; }>{
        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY environment variable is not set');
        }
        if (!NEWSLETTER_FROM_EMAIL) {
            throw new Error('NEWSLETTER_FROM_EMAIL or GMAIL_USER must be set');
        }

        const batchSize = 500; // conservative batch size
        let sent = 0;
        const failures: string[] = [];

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            const msg = {
                from: { email: NEWSLETTER_FROM_EMAIL, name: NEWSLETTER_FROM_NAME },
                subject: campaign.subject,
                html: campaign.html,
                personalizations: batch.map(email => ({ to: [{ email }] })),
            } as sgMail.MailDataRequired;

            try {
                await sgMail.send(msg, true); // true enables multiple sends for personalizations
                sent += batch.length;
            } catch (error) {
                console.error('SendGrid batch send failed:', error);
                failures.push(...batch);
            }
        }

        return { total: recipients.length, sent, failed: failures.length, failures };
    }
}