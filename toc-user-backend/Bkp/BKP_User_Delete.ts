//// api/user/Delete.ts - Refactored
//import type { VercelResponse } from '@vercel/node';
//import { createHandler } from '../../services/utils/HandlerFactory';
//import { Validators } from '../../services/validators';
//import { ResponseUtils } from '../../services/utils/ResponseUtils';
//import {
//    findUserByEmail,
//    deleteUser as deleteUserFromDB,
//    deleteUserAvatar
//} from '../../services/utils/supabaseUtils/UserUtils';
//import { AuthenticatedRequest } from '../../services/middleware/Auth';

//const deleteUser = async (req: AuthenticatedRequest, res: VercelResponse) => {
//  // Get email from JWT token (secure)
//  const email = req.user.email;
//  const { confirmDelete } = req.body;

//  // Validate confirmDelete
//  if (!confirmDelete) {
//    ResponseUtils.send(res, ResponseUtils.error('Account deletion must be confirmed by setting confirmDelete to true', 400));
//    return;
//  }

//  // Check if user exists
//  const existingUser = await findUserByEmail(email);
//  if (!existingUser) {
//    ResponseUtils.send(res, ResponseUtils.notFound('User not found'));
//    return;
//  }

//  // Delete user avatar if exists
//  if (existingUser.profile?.avatar_url) {
//    try {
//      await deleteUserAvatar(existingUser.profile.avatar_url);
//    } catch (avatarError) {
//      console.warn('Failed to delete user avatar:', avatarError);
//      // Continue with user deletion even if avatar deletion fails
//    }
//  }

//  // Delete user from database (cascades to UserProfile)
//  await deleteUserFromDB(existingUser.user_id);

//  ResponseUtils.send(res, ResponseUtils.deleted({}, 'User account deleted successfully'));
//};

//export default createHandler(deleteUser, {
//  requireAuth: true,
//  allowedMethods: ['DELETE'],
//  validator: Validators.userDelete
//});