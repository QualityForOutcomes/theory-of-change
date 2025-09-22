import nodemailer from 'nodemailer';
import { env } from '../env';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: env.EMAIL_SERVICE,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.warn('Email credentials not configured. Token logged to console instead.');
      return;
    }

    const mailOptions = {
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Use this code to reset your password:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
            ${resetToken}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent by ${env.EMAIL_FROM_NAME}. If you have any questions, please contact our support team.
          </p>
        </div>
      `,
      text: `Password Reset Request\n\nYou requested a password reset. Use this code to reset your password: ${resetToken}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}. Message ID: ${result.messageId}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Fallback to console logging
      console.log(`Password reset token for ${email}: ${resetToken}`);
      throw new Error('Failed to send reset email');
    }
  }
}

export const emailService = new EmailService();