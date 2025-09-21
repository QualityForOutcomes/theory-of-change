// api/user/projectList.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponseUtils } from '../../services/utils/ResponseUtils';
import { CorsUtils } from '../../services/utils/CorsUtils';
import { ProjectService } from '../../services/ProjectService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    CorsUtils.setCors(res);
    if (CorsUtils.handleOptions(req, res)) return;

    if (req.method !== 'GET') {
        return ResponseUtils.send(res, ResponseUtils.error('Method not allowed', 405));
    }

    try {
        const { userId } = req.query;

        // Validate required parameters
        if (!userId || typeof userId !== 'string') {
            return ResponseUtils.send(res, ResponseUtils.error('userId is required', 400));
        }

        // Get all projects for the user
        const projects = await ProjectService.listUserProjects(userId);

        // Extract only project names and IDs
        const projectList = projects.map((project, index) => ({
            projectId: project.projectId,
            projectName: project.tocData?.projectTitle || `Project ${index + 1}`,
        }));

        // Sort by project name alphabetically
        projectList.sort((a, b) => a.projectName.localeCompare(b.projectName));

        return ResponseUtils.send(res, ResponseUtils.success({
            projects: projectList,
            count: projectList.length
        }, 'Project list retrieved successfully'));

    } catch (err) {
        console.error('API Error:', err);
        return ResponseUtils.send(res, ResponseUtils.error('Failed to retrieve project list', 500));
    }
}