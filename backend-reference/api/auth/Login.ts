// api/auth/Login.ts
/**
 * Login API Endpoint
 * 
 * Authenticates users with email and password credentials.
 * Creates a session and returns JWT token with user profile data.
 * 
 * @route POST /api/auth/login
 * @access Public
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { findUserByEmail } from '../../utils/supabaseUtils/UserUtils';
import { createUserSession } from '../../utils/supabaseUtils/SessionUtils';
import UserResponse from '../../entities/user/UserResponse';

/**
 * Handles user login authentication
 * 
 * Process:
 * 1. Finds user by email
 * 2. Validates password hash
 * 3. Creates user session
 * 4. Generates JWT token
 * 5. Returns user profile and token
 * 
 * @param req - Request containing email and password in body
 * @param res - Response object
 * @returns User profile and JWT token on success, error message on failure
 */
const loginUser = async (req: VercelRequest, res: VercelResponse) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
        ResponseUtils.send(res, ResponseUtils.unauthorized('Invalid email or password'));
        return;
    }

    // Verify password against stored hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        ResponseUtils.send(res, ResponseUtils.unauthorized('Invalid email or password'));
        return;
    }

    // Create user session in database
    await createUserSession(user.user_id);

    // Generate JWT token
    const token = signToken(user);

    // Build user response object (excludes sensitive data like password)
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
    }, 'Login successful'));
};

/**
 * Generates a JWT token for authenticated user
 * 
 * @param user - User object containing user_id and email
 * @returns Signed JWT token string with 24h expiration
 */
// TODO
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
export default createHandler(loginUser, {
    allowedMethods: ['POST'],
    validator: Validators.userLogin
});