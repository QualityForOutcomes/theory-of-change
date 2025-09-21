// api/user/userResetPassword.ts - Updated for new table structure
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
    findUserByEmail,
    storePasswordResetToken,
    findValidResetToken,
    updateUserPassword,
    deleteResetToken,
    type CompleteUser,
    type PasswordResetToken
} from '../../services/utils/Supabase';
import ValidationUtils from '../../services/utils/ValidationUtils';

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
});

// Types for request body
interface ResetRequestBody {
    email: string;
    action: 'request-reset' | 'verify-token';
    token?: string;
    newPassword?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, action, token, newPassword }: ResetRequestBody = req.body;

        // Validate email format
        if (!email || !ValidationUtils.isValidEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        if (action === 'request-reset') {
            return await handleResetRequest(email, res);
        } else if (action === 'verify-token') {
            if (!token || !newPassword) {
                return res.status(400).json({
                    error: 'Token and new password are required'
                });
            }
            return await handleTokenVerification(email, token, newPassword, res);
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Step 1: Handle password reset request
async function handleResetRequest(email: string, res: VercelResponse) {
    try {
        // 1. Verify email exists in database
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(200).json({
                message: 'This email does not exist in our system'
            });
        }

        // 2. Generate secure token (8 character code for user-friendly experience)
        const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // 3. Store token in database
        await storePasswordResetToken({
            userId: user.user_id,  // Updated to use user_id
            email: email,
            token: resetToken,
            expiresAt: tokenExpiry
        });

        // 4. Send email with token using Gmail SMTP
        try {
            console.log('Sending email via Gmail SMTP...');

            // Get sender info from environment variables
            const senderEmail = process.env.GMAIL_USER;
            const senderName = process.env.GMAIL_SENDER_NAME || 'Quality for Outcomes';

            if (!senderEmail) {
                throw new Error('GMAIL_USER environment variable is not set');
            }

            // Get user's display name for personalization
            const displayName = user.profile
                ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
                : user.username || 'User';

            const emailResult = await transporter.sendMail({
                from: `"${senderName}" <${senderEmail}>`,
                to: email,
                subject: 'Password Reset Code',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Password Reset Request</h2>
                  ${displayName ? `<p>Hello ${displayName},</p>` : ''}
                  <p>You requested a password reset. Use this code to reset your password:</p>
                  <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
                    ${resetToken}
                  </div>
                  <p>This code will expire in 15 minutes.</p>
                  <p>If you didn't request this, please ignore this email.</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 12px;">
                    This email was sent by ${senderName}. If you have any questions, please contact our support team.
                  </p>
                </div>
                `,
                text: `Password Reset Request\n\n${displayName ? `Hello ${displayName},\n\n` : ''}You requested a password reset. Use this code to reset your password: ${resetToken}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
            });

            console.log('Email sent successfully:', emailResult.messageId);

            return res.status(200).json({
                message: 'If this email exists, you should receive a reset code',
                debug: {
                    emailSent: true,
                    messageId: emailResult.messageId,
                    recipientEmail: email,
                    timestamp: new Date().toISOString(),
                    // Remove token in production!
                    resetToken: process.env.NODE_ENV === 'development' ? resetToken : 'hidden'
                }
            });

        } catch (emailError: any) {
            console.error('EMAIL SEND ERROR:', {
                message: emailError.message,
                code: emailError.code,
                responseCode: emailError.responseCode,
                response: emailError.response
            });

            return res.status(500).json({
                error: 'Failed to send reset email',
                debug: {
                    emailSent: false,
                    errorMessage: emailError.message,
                    errorCode: emailError.code,
                    responseCode: emailError.responseCode
                }
            });
        }
    } catch (error) {
        console.error('General error in handleResetRequest:', error);
        return res.status(500).json({ error: 'Failed to process reset request' });
    }
}

// Step 2: Handle token verification and password reset
async function handleTokenVerification(
    email: string,
    token: string,
    newPassword: string,
    res: VercelResponse
) {
    try {
        // 1. Find valid reset token
        const resetRecord = await findValidResetToken(email, token.toUpperCase());

        if (!resetRecord) {
            return res.status(400).json({
                error: 'Invalid or expired reset code'
            });
        }

        // 2. Validate new password
        const passwordValidation = ValidationUtils.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: passwordValidation.message
            });
        }

        // 3. Hash and update user password
        const hashedPassword = await ValidationUtils.hashPassword(newPassword);
        await updateUserPassword(resetRecord.user_id, hashedPassword);

        // 4. Delete used reset token
        await deleteResetToken(resetRecord.id);

        return res.status(200).json({
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Failed to reset password' });
    }
}

