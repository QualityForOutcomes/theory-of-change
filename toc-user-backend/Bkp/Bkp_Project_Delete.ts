//// api/project/Delete.ts - Refactored
//import type { VercelResponse } from '@vercel/node';
//import { createHandler } from '../../services/utils/HandlerFactory';
//import { Validators } from '../../services/validators';
//import { ResponseUtils } from '../../services/utils/ResponseUtils';
//import { ProjectService } from '../../services/ProjectService';
//import { AuthenticatedRequest } from '../../services/middleware/Auth';

//const deleteProject = async (req: AuthenticatedRequest, res: VercelResponse) => {
//  // Get userId from JWT token (secure)
//  const userId = req.user.userId.toString();
//  const { projectId } = req.body;

//  // Validate projectId
//  if (!projectId || typeof projectId !== 'string') {
//    ResponseUtils.send(res, ResponseUtils.error('projectId is required', 400));
//    return;
//  }

//  console.log(`Delete request - UserId: ${userId}, ProjectId: ${projectId}`);

//  // Use ProjectService delete method - all logic is in the service
//  const deleted = await ProjectService.deleteProject(userId, projectId);

//  if (!deleted) {
//    ResponseUtils.send(res, ResponseUtils.notFound(`Project with ID ${projectId} not found for user ${userId}`));
//    return;
//  }

//  ResponseUtils.send(res, ResponseUtils.deleted({
//    userId,
//    projectId
//  }, 'Project deleted successfully'));
//};

//export default createHandler(deleteProject, {
//  requireAuth: true,
//  allowedMethods: ['DELETE'],
//  validator: Validators.deleteProject
//});