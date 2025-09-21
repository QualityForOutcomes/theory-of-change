import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseUtils } from '../../services/utils/ResponseUtils';
import { CorsUtils } from '../../services/utils/CorsUtils';
import { ProjectService } from '../../services/ProjectService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    CorsUtils.setCors(res);
    if (CorsUtils.handleOptions(req, res)) return;

    if (req.method !== 'DELETE') {
        return ResponseUtils.send(res, ResponseUtils.error('Method not allowed', 405));
    }

    try {
        const { userId, projectId } = req.body;

        // Validate required fields
        if (!userId || typeof userId !== 'string') {
            return ResponseUtils.send(res, ResponseUtils.error('userId is required', 400));
        }

        if (!projectId || typeof projectId !== 'string') {
            return ResponseUtils.send(res, ResponseUtils.error('projectId is required', 400));
        }

        console.log(`Delete request - UserId: ${userId}, ProjectId: ${projectId}`);

        // Use ProjectService delete method - all logic is in the service
        const deleted = await ProjectService.deleteProject(userId, projectId);

        if (!deleted) {
            return ResponseUtils.send(res, ResponseUtils.error(`Project with ID ${projectId} not found for user ${userId}`, 404));
        }

        return ResponseUtils.send(res, ResponseUtils.success({
            userId,
            projectId
        }, 'Project deleted successfully'));

    } catch (err) {
        console.error('Delete Project API Error:', err);
        return ResponseUtils.send(res, ResponseUtils.error('Failed to delete project', 500));
    }
}