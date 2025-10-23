// api/auth/google.ts
/**
 * Google OAuth Authentication Endpoint
 * 
 * Authenticates users via Google Sign-In using Firebase ID tokens.
 * Verifies the token, upserts user data, and returns JWT with user profile.
 * 
 * @route POST /api/auth/google
 * @access Public
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import * as jwt from 'jsonwebtoken';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { upsertGoogleUser } from '../../utils/supabaseUtils/UserUtils';
import { createUserSession } from '../../utils/supabaseUtils/SessionUtils';
import UserResponse from '../../entities/user/UserResponse';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const key = process.env.FIREBASE_ADMIN_KEY;
    if (!key) {
        console.warn('FIREBASE_ADMIN_KEY is not set');
    } else {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(key)),
        });
    }
}

/**
 * Handles Google OAuth authentication
 * 
 * Process:
 * 1. Verifies Firebase ID token
 * 2. Extracts user profile from token
 * 3. Upserts user in database
 * 4. Creates user session
 * 5. Generates JWT token
 * 6. Returns user profile and token
 * 
 * @param req - Request containing idToken in body
 * @param res - Response object
 * @returns User profile and JWT token on success, error message on failure
 */
const googleAuth = async (req: VercelRequest, res: VercelResponse) => {
    const { idToken } = req.body;

    // Verify Firebase Admin is initialized
    if (!admin.apps.length) {
        ResponseUtils.send(res, ResponseUtils.error('Firebase admin not initialized'));
        return;
    }

    try {
        // Verify the Firebase ID token
        const decoded = await getAuth().verifyIdToken(idToken);

        // Extract user information from decoded token
        const uid = decoded.uid;
        const email = decoded.email ?? null;
        const name = decoded.name ?? '';
        const picture = decoded.picture ?? null;

        // Parse name into first and last name
        const [firstName, ...rest] = name.trim().split(' ').filter(Boolean);
        const lastName = rest.join(' ') || null;

        // Upsert user in database
        const user = await upsertGoogleUser({
            firebaseUid: uid,
            email,
            username: email ? email.split('@')[0] : uid,
            firstName: firstName || null,
            lastName: lastName || null,
            avatarUrl: picture,
        });

        // Create user session in database
        await createUserSession(user.user_id);

        // Generate JWT token
        const token = signToken(user);

        // Build user response object
        const profile = user.profile;
        const userResponse: UserResponse = {
            userId: user.user_id,
            email: user.email,
            username: user.username,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            organisation: profile?.organisation,
            avatarUrl: profile?.avatar_url,
            displayName: profile
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                : user.username || user.email,
            userRole: user.user_role,
        };

        // Send success response with user data and token
        ResponseUtils.send(res, ResponseUtils.success({
            user: userResponse,
            token
        }, 'Google login successful'));

    } catch (err: any) {
        console.error('Google auth error:', err);
        ResponseUtils.send(res, ResponseUtils.unauthorized(err?.message || 'Invalid token'));
    }
};

/**
 * Generates a JWT token for authenticated user
 * 
 * @param user - User object containing user_id and email
 * @returns Signed JWT token string with 24h expiration
 */
function signToken(user: { user_id: number; email: string }) {
    return jwt.sign(
        {
            sub: user.user_id.toString(),
            email: user.email,
            userId: user.user_id
        },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "24h" }
    );
}

// Export handler with POST method restriction and input validation
export default createHandler(googleAuth, {
    allowedMethods: ['POST'],
    //validator: Validators.googleAuth
});