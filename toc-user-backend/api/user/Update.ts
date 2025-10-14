/**
 * Update User Profile API Endpoint
 * 
 * Updates the authenticated user's profile information.
 * Allows modification of username, personal details, and avatar.
 * 
 * @route PUT/PATCH /api/user/update
 * @access Private (requires authentication)
 */
import type { VercelResponse } from '@vercel/node';
import { createHandler } from '../../utils/HandlerFactory';
import { Validators } from '../../validators';
import { ResponseUtils } from '../../utils/ResponseUtils';
import ValidationUtils from '../../validators/ValidationUtils';
import {
    findUserByEmail,
    updateUserDetails,
    checkUsernameExists,
    getUserProfile
} from '../../utils/supabaseUtils/UserUtils';
import { AuthenticatedRequest } from '../../middleware/Auth';
import { UpdateUserRequest } from '../../entities/user/UpdateUserRequest';
import { UserTableUpdate } from '../../entities/user/UserTableUpdate';
import { ProfileTableUpdate } from '../../entities/user/ProfileTableUpdate';




/**
 * Handles user profile updates for authenticated users
 * 
 * Process:
 * 1. Extracts email from JWT token
 * 2. Validates user existence
 * 3. Validates username format and uniqueness (if provided)
 * 4. Prepares update data for user and profile tables
 * 5. Updates user details in database
 * 6. Fetches and returns updated profile
 * 
 * @param req - Authenticated request containing update data in body
 * @param res - Response object
 * @returns Updated user profile on success, validation errors on failure
 */
const updateUser = async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    // Extract email from JWT token (secure)
    const email = req.user.email;

    /*const {
        username,
        firstName,
        lastName,
        organisation,
        avatarURL
    } = req.body;*/
    const {
        username,
            firstName,
            lastName,
            organisation,
            avatarURL
    }: UpdateUserRequest = req.body;

    console.log("email: ", email);

    // Verify user exists in database
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
        ResponseUtils.send(res, ResponseUtils.notFound('User not found'));
        return;
    }

    // Validate username format and uniqueness if being updated
    if (username !== undefined) {
        // Validate username format
        if (username && !ValidationUtils.isValidUsername(username)) {
            ResponseUtils.send(res, ResponseUtils.error('Username must be 3-30 characters and contain only letters, numbers, and underscores', 400));
            return;
        }

        // Check username uniqueness if it's different from current username
        if (username && username !== existingUser.username) {
            const usernameExists = await checkUsernameExists(username);
            if (usernameExists) {
                ResponseUtils.send(res, ResponseUtils.conflict('Username already taken'));
                return;
            }
        }
    }

    // Prepare update data for user table
    // const userData: { username?: string } = {};
    const userData: UserTableUpdate = {};
    if (username !== undefined) userData.username = username;

    // Prepare update data for profile table
    //const profileData: {
    //    first_name?: string;
    //    last_name?: string;
    //    organisation?: string;
    //    avatar_url?: string;
    //} = {};
    const profileData: ProfileTableUpdate = {};
    if (firstName !== undefined) profileData.first_name = firstName;
    if (lastName !== undefined) profileData.last_name = lastName;
    if (organisation !== undefined) profileData.organisation = organisation;
    if (avatarURL !== undefined) profileData.avatar_url = avatarURL;

    // Update user and profile data in database
    await updateUserDetails(email, userData, profileData);

    // Fetch updated profile to return to client
    const updatedProfile = await getUserProfile(email);

    ResponseUtils.send(res, ResponseUtils.updated(updatedProfile, 'User details updated successfully'));
};

// Export handler with authentication requirement, PUT/PATCH methods, and input validation
export default createHandler(updateUser, {
    requireAuth: true,
    allowedMethods: ['PUT', 'PATCH'],
    validator: Validators.userUpdate
});