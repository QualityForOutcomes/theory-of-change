/**
 * User Registration API Endpoint
 * 
 * Registers a new user with email and password credentials.
 * Creates user account and associated profile with provided details.
 * 
 * @route POST /api/user/create
 * @access Public
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import { createUser, checkEmailExists, checkUsernameExists } from '../../services/UserService';
import { UserData } from '../../entities/user/UserData';

/**
 * Handles user registration
 * 
 * Process:
 * 1. Extracts registration data from request body
 * 2. Validates email uniqueness
 * 3. Validates username uniqueness (if provided)
 * 4. Creates user account with hashed password
 * 5. Creates associated user profile
 * 6. Returns created user data
 * 
 * @param req - Request containing registration data in body
 * @param res - Response object
 * @returns Created user data on success, conflict error if email/username exists
 */
const registerUser = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    //const { email, password, username, firstName, lastName, organisation, acceptTandC, newsLetterSubs } = req.body;
    const {
        email,
        password,
        username,
        firstName,
        lastName,
        organisation,
        acceptTandC,
        newsLetterSubs
    }: UserData = req.body;

    // Check if email is already registered in the system
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
        ResponseUtils.send(res, ResponseUtils.conflict('Email already registered'));
        return;
    }

    // Check if username is already taken (if username provided)
    if (username) {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            ResponseUtils.send(res, ResponseUtils.conflict('Username already taken'));
            return;
        }
    }

    // Create user account and associated profile
    const newUser = await createUser({
        email,
        password,
        username,
        firstName,
        lastName,
        organisation,
        acceptTandC,
        newsLetterSubs
    });

    ResponseUtils.send(res, ResponseUtils.created(newUser, 'User registered successfully'));
};

// Export handler with POST method restriction and input validation
export default createHandler(registerUser, {
    allowedMethods: ['POST'],
    validator: Validators.userRegistration
});