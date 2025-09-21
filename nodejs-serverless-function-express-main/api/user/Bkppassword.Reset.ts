//// api/user/userResetPassword.ts
//import type { VercelRequest, VercelResponse } from '@vercel/node';
//import { Resend } from 'resend';
//import crypto from 'crypto';
//import bcrypt from 'bcrypt';
//import {
//    findUserByEmail,
//    storePasswordResetToken,
//    findValidResetToken,
//    updateUserPassword,
//    deleteResetToken,
//    type User,
//    type PasswordResetToken
//} from '../../services/utils/Supabase';

////const resend = new Resend(process.env.RESEND_API_KEY);
////const resend = "re_4NQGERWM_Ea7DCHeTfs2jcSbVcvLC4XNb";
//const resend = new Resend('re_4NQGERWM_Ea7DCHeTfs2jcSbVcvLC4XNb');
//// Types for request body
//interface ResetRequestBody {
//    email: string;
//    action: 'request-reset' | 'verify-token';
//    token?: string;
//    newPassword?: string;
//}

//export default async function handler(req: VercelRequest, res: VercelResponse) {
//    if (req.method !== 'POST') {
//        return res.status(405).json({ error: 'Method not allowed' });
//    }

//    try {
//        const { email, action, token, newPassword }: ResetRequestBody = req.body;

//        // Validate email format
//        if (!email || !isValidEmail(email)) {
//            return res.status(400).json({ error: 'Valid email is required' });
//        }

//        if (action === 'request-reset') {
//            return await handleResetRequest(email, res);
//        } else if (action === 'verify-token') {
//            if (!token || !newPassword) {
//                return res.status(400).json({
//                    error: 'Token and new password are required'
//                });
//            }
//            return await handleTokenVerification(email, token, newPassword, res);
//        } else {
//            return res.status(400).json({ error: 'Invalid action' });
//        }
//    } catch (error) {
//        console.error('Password reset error:', error);
//        return res.status(500).json({ error: 'Internal server error' });
//    }
//}

//// Step 1: Handle password reset request
//async function handleResetRequest(email: string, res: VercelResponse) {
//    try {
//        // 1. Verify email exists in database
//        const user = await findUserByEmail(email);
//        if (!user) {
//            // Reveal if email exists or not for security
//            return res.status(200).json({
//                message: 'This email not exists'
//            });
//        }

//        // 2. Generate secure token (8 character code for user-friendly experience)
//        const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
//        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

//        // 3. Store token in database
//        await storePasswordResetToken({
//            userId: user.id,
//            email: email,
//            token: resetToken,
//            expiresAt: tokenExpiry
//        });

//        // 4. Send email with token
//        /*await resend.emails.send({
//            from: 'toc@resend.dev',
//            to: [email],
//            subject: 'Password Reset Code',
//            html: `
//        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//          <h2>Password Reset Request</h2>
//          <p>You requested a password reset. Use this code to reset your password:</p>
//          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
//            ${resetToken}
//          </div>
//          <p>This code will expire in 15 minutes.</p>
//          <p>If you didn't request this, please ignore this email.</p>
//        </div>
//      `
//        });

//        return res.status(200).json({
//            message: 'If this email exists, you sould receive a reset code'
//        });*/
//        try {
//            console.log('16. Calling resend.emails.send...');
//            const emailResult = await resend.emails.send({
//                from: 'Quality for Outcomes <onboarding@resend.dev>', // Use verified domain
//                to: [email],
//                subject: 'Password Reset Code - Debug Version',
//                html: `
//                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//                  <h2>Password Reset Request (Debug)</h2>
//                  <p>You requested a password reset. Use this code to reset your password:</p>
//                  <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; border-radius: 8px;">
//                    ${resetToken}
//                  </div>
//                  <p>This code will expire in 15 minutes.</p>
//                  <p>Debug info: Email sent to ${email} at ${new Date().toISOString()}</p>
//                  <p>If you didn't request this, please ignore this email.</p>
//                </div>
//                `
//            });

//            console.log('17. Email API Response:', JSON.stringify(emailResult, null, 2));
//            console.log('18. Email ID:', emailResult.data?.id);
//            console.log('19. Email error (if any):', emailResult.error);

//            return res.status(200).json({
//                message: 'If this email exists, you should receive a reset code',
//                debug: {
//                    emailSent: true,
//                    emailId: emailResult.data?.id,
//                    recipientEmail: email,
//                    timestamp: new Date().toISOString(),
//                    // Remove token in production!
//                    resetToken: process.env.NODE_ENV === 'development' ? resetToken : 'hidden'
//                }
//            });

//        } catch (emailError: any) {
//            console.error('18. EMAIL SEND ERROR:', {
//                message: emailError.message,
//                status: emailError.status,
//                code: emailError.code,
//                name: emailError.name,
//                stack: emailError.stack,
//                fullError: emailError
//            });
            
//            return res.status(500).json({ 
//                error: 'Failed to send reset email',
//                debug: {
//                    emailSent: false,
//                    errorMessage: emailError.message,
//                    errorCode: emailError.code
//                }
//            });
//        }
//    } catch (emailError) {
//        console.error('Email send error:', emailError);
//        return res.status(500).json({ error: 'Failed to send reset email' });
//    }
//}

//// Step 2: Handle token verification and password reset
//async function handleTokenVerification(
//    email: string,
//    token: string,
//    newPassword: string,
//    res: VercelResponse
//) {
//    try {
//        // 1. Find valid reset token
//        const resetRecord = await findValidResetToken(email, token.toUpperCase());

//        if (!resetRecord) {
//            return res.status(400).json({
//                error: 'Invalid or expired reset code'
//            });
//        }

//        // 2. Validate new password
//        const passwordValidation = validatePassword(newPassword);
//        if (!passwordValidation.isValid) {
//            return res.status(400).json({
//                error: passwordValidation.message
//            });
//        }

//        // 3. Hash and update user password
//        const hashedPassword = await hashPassword(newPassword);
//        await updateUserPassword(resetRecord.user_id, hashedPassword);

//        // 4. Delete used reset token
//        await deleteResetToken(resetRecord.id);

//        return res.status(200).json({
//            message: 'Password reset successful'
//        });
//    } catch (error) {
//        console.error('Token verification error:', error);
//        return res.status(500).json({ error: 'Failed to reset password' });
//    }
//}

//// Utility functions
//function isValidEmail(email: string): boolean {
//    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//    return emailRegex.test(email);
//}

//function validatePassword(password: string): { isValid: boolean; message: string } {
//    if (!password) {
//        return { isValid: false, message: 'Password is required' };
//    }

//    if (password.length < 8) {
//        return { isValid: false, message: 'Password must be at least 8 characters long' };
//    }

//    if (!/(?=.*[a-z])/.test(password)) {
//        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
//    }

//    if (!/(?=.*[A-Z])/.test(password)) {
//        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
//    }

//    if (!/(?=.*\d)/.test(password)) {
//        return { isValid: false, message: 'Password must contain at least one number' };
//    }

//    return { isValid: true, message: 'Password is valid' };
//}

//async function hashPassword(password: string): Promise<string> {
//    try {
//        const saltRounds = 12;
//        return await bcrypt.hash(password, saltRounds);
//    } catch (error) {
//        console.error('Error hashing password:', error);
//        throw new Error('Failed to hash password');
//    }
//}