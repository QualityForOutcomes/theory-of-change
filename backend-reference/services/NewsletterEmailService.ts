import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local (useful for local dev)
dotenv.config({ path: '.env.local' });

export class NewsletterEmailService {
    /**
     * Nodemailer transporter configured for Gmail SMTP
     * Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables
     */
    private static transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    /**
     * Sends a welcome email to users who subscribe to the newsletter
     * @param email Recipient email address
     * @param displayName Optional display name for greeting
     */
    static async sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
        const senderEmail = process.env.GMAIL_USER;
        const senderName = process.env.GMAIL_SENDER_NAME || 'Quality for Outcomes';

        if (!senderEmail) {
            throw new Error('GMAIL_USER environment variable is not set');
        }
        if (!process.env.GMAIL_APP_PASSWORD) {
            throw new Error('GMAIL_APP_PASSWORD environment variable is not set');
        }

        const greeting = displayName && displayName.trim() && displayName.trim().toLowerCase() !== 'user'
            ? `Hello ${displayName.trim()},`
            : 'Hello,';

        const html = NewsletterEmailService.buildWelcomeTemplate(greeting, senderName);

        const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
            to: email,
            subject: 'Welcome to our Newsletter',
            html
        };

        await NewsletterEmailService.transporter.sendMail(mailOptions);
    }

    private static buildWelcomeTemplate(greeting: string, senderName: string): string {
        return `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>${greeting}</p>
                <p>Thanks for subscribing to our newsletter! 🎉</p>
                <p>We'll keep you updated with product news, tips, and exclusive content.</p>
                <p>If you ever want to unsubscribe, you can update your preferences from your account settings.</p>
                <br/>
                <p>Best regards,<br/><strong>${senderName}</strong></p>
            </div>
        `;
    }
}