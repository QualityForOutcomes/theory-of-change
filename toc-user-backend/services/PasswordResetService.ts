/**
 * Password Reset Service
 * 
 * Handles password reset functionality including:
 * - Generating and sending reset tokens via email
 * - Verifying reset tokens
 * - Updating user passwords
 * 
 * Uses nodemailer with Gmail SMTP for email delivery.
 * Tokens are 8-character hex strings with 15-minute expiry.
 */
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import { ApiResponse } from '../entities/ApiResponse';
import { PasswordResetTokenData } from '../entities/auth/PasswordResetTokenData';
import { CompleteUser } from '../dto/CompleteUser';
import ValidationUtils from '../validators/ValidationUtils';
import {
    findUserByEmail,
    storePasswordResetToken,
    findValidResetToken,
    updateUserPassword,
    deleteResetToken
} from '../utils/supabaseUtils/UserUtils';

/**
 * Email result interface for sendResetEmail response
 */
interface EmailResult {
    messageId: string;
}

/**
 * Password reset token record from database
 */
interface ResetTokenRecord {
    id: number;
    user_id: number;
    email: string;
    token: string;
    expires_at: Date;
}

export class PasswordResetService {
    /** Token expiry duration in minutes */
    private static readonly TOKEN_EXPIRY_MINUTES = 15;

    /** Number of random bytes for token generation (4 bytes = 8 hex characters) */
    private static readonly TOKEN_BYTE_LENGTH = 4;

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
     * Initiates password reset process by generating and sending reset token
     * 
     * Process:
     * 1. Validates email format
     * 2. Checks if user exists (security: always returns success message)
     * 3. Generates 8-character hex reset token
     * 4. Stores token with 15-minute expiry
     * 5. Sends reset email with token
     * 
     * @param email - User's email address
     * @returns Success response regardless of user existence (security feature to prevent email enumeration)
     */
    static async requestPasswordReset(email: string): Promise<ApiResponse> {
        try {
            // Validate email format
            const emailValidation = ValidationUtils.validateEmail(email);
            if (!emailValidation.isValid) {
                return {
                    success: false,
                    message: emailValidation.message,
                    statusCode: 400
                };
            }

            // Check if user exists in database
            const user: CompleteUser | null = await findUserByEmail(email);
            if (!user) {
                // Security: Return success even if user doesn't exist to prevent email enumeration
                return {
                    success: true,
                    message: 'If this email exists, you will receive a reset code',
                    statusCode: 200
                };
            }

            // Generate 8-character uppercase hex token (e.g., "A1B2C3D4")
            const resetToken = crypto.randomBytes(this.TOKEN_BYTE_LENGTH).toString('hex').toUpperCase();

            // Set token expiry to 15 minutes from now
            const tokenExpiry = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);

            // Prepare token data for storage
            const tokenData: PasswordResetTokenData = {
                userId: user.user_id.toString(),
                email: email,
                token: resetToken,
                expiresAt: tokenExpiry
            };

            // Store token in database
            await storePasswordResetToken(tokenData);

            // Send reset email with token
            const emailResult = await this.sendResetEmail(user, email, resetToken);

            if (emailResult.success) {
                console.log('Password reset email sent successfully');
            } else {
                console.error('Failed to send password reset email:', emailResult.error);
            }

            // Always return generic success message for security
            return {
                success: true,
                message: 'If this email exists, you will receive a reset code',
                statusCode: 200
            };
        } catch (error: unknown) {
            console.error('Password reset request error:', error);
            return {
                success: false,
                message: 'Failed to process reset request',
                error: error instanceof Error ? error.message : 'Unknown error',
                statusCode: 500
            };
        }
    }

    /**
     * Verifies reset token and updates user password
     * 
     * Process:
     * 1. Validates email format
     * 2. Validates token and new password are provided
     * 3. Checks if token exists and is valid (not expired)
     * 4. Validates new password strength
     * 5. Hashes new password
     * 6. Updates user password in database
     * 7. Deletes used reset token
     * 
     * @param email - User's email address
     * @param token - Reset token received via email
     * @param newPassword - New password to set
     * @returns Success response if password reset, error if invalid token or validation fails
     */
    static async verifyTokenAndResetPassword(
        email: string,
        token: string,
        newPassword: string
    ): Promise<ApiResponse> {
        try {
            // Validate email format
            const emailValidation = ValidationUtils.validateEmail(email);
            if (!emailValidation.isValid) {
                return {
                    success: false,
                    message: emailValidation.message,
                    statusCode: 400
                };
            }

            // Ensure token and password are provided
            if (!token || !newPassword) {
                return {
                    success: false,
                    message: 'Token and new password are required',
                    statusCode: 400
                };
            }

            // Find valid (non-expired) reset token for this email
            const resetRecord: ResetTokenRecord | null = await findValidResetToken(email, token.toUpperCase());
            if (!resetRecord) {
                return {
                    success: false,
                    message: 'Invalid or expired reset code',
                    statusCode: 400
                };
            }

            // Validate new password meets strength requirements
            const passwordValidation = ValidationUtils.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    message: passwordValidation.message,
                    statusCode: 400
                };
            }

            // Hash the new password before storing
            const hashedPassword = await ValidationUtils.hashPassword(newPassword);

            // Update user's password in database
            await updateUserPassword(resetRecord.user_id, hashedPassword);

            // Delete the used reset token to prevent reuse
            await deleteResetToken(resetRecord.id);

            return {
                success: true,
                message: 'Password reset successful',
                statusCode: 200
            };
        } catch (error: unknown) {
            console.error('Password reset verification error:', error);
            return {
                success: false,
                message: 'Failed to reset password',
                error: error instanceof Error ? error.message : 'Unknown error',
                statusCode: 500
            };
        }
    }

    /**
     * Sends password reset email with token
     * 
     * Uses Gmail SMTP to send formatted HTML email containing:
     * - Personalized greeting
     * - 8-character reset code
     * - Expiry information (15 minutes)
     * 
     * @param user - Complete user object from database with profile
     * @param email - Recipient email address
     * @param resetToken - 8-character reset token to include in email
     * @returns Email send result with message ID
     * @private
     */
    private static async sendResetEmail(
        user: CompleteUser,
        email: string,
        resetToken: string
    ): Promise<ApiResponse<EmailResult>> {
        try {
            console.log('Sending email via Gmail SMTP...');

            const senderEmail = process.env.GMAIL_USER;
            const senderName = process.env.GMAIL_SENDER_NAME || 'Quality for Outcomes';

            // Validate required email configuration
            if (!senderEmail) {
                throw new Error('GMAIL_USER environment variable is not set');
            }
            if (!process.env.GMAIL_APP_PASSWORD) {
                throw new Error('GMAIL_APP_PASSWORD environment variable is not set');
            }

            // Build personalized display name from user profile or fallback to username
            const displayName = user.profile
                ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
                : user.username || 'User';

            // Configure email content and formatting
            const mailOptions = {
                from: `"${senderName}" <${senderEmail}>`,
                to: email,
                subject: 'Password Reset Code',
                html: this.buildResetEmailTemplate(displayName, resetToken, senderName)
            };

            // Send email via SMTP
            const emailResult = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', emailResult.messageId);

            return {
                success: true,
                message: 'Email sent successfully',
                data: { messageId: emailResult.messageId },
                statusCode: 200
            };
        } catch (error: unknown) {
            // Log detailed error information for debugging
            if (error instanceof Error) {
                console.error('EMAIL SEND ERROR:', {
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error('EMAIL SEND ERROR:', error);
            }

            return {
                success: false,
                message: 'Failed to send email',
                error: error instanceof Error ? error.message : 'Unknown error',
                statusCode: 500
            };
        }
    }

    /**
     * Builds HTML email template for password reset
     * 
     * Creates a responsive, styled email with:
     * - Personalized greeting
     * - Prominent reset code display
     * - Expiry warning
     * - Security notice
     * 
     * @param displayName - User's display name for personalization
     * @param resetToken - 8-character reset token to display
     * @param senderName - Sender organization name
     * @returns Formatted HTML email content
     * @private
     */
    private static buildResetEmailTemplate(
        displayName: string,
        resetToken: string,
        senderName: string
    ): string {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                ${displayName !== 'User' ? `<p>Hello ${displayName},</p>` : '<p>Hello,</p>'}
                <p>You requested a password reset. Use this code to reset your password:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
                    ${resetToken}
                </div>
                <p>This code will expire in ${this.TOKEN_EXPIRY_MINUTES} minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    This email was sent by ${senderName}. If you have any questions, please contact our support team.
                </p>
            </div>
        `;
    }
}