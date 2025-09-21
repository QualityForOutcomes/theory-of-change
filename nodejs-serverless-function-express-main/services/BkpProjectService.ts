//import { createClient } from '@supabase/supabase-js';
//import { put } from '@vercel/blob';
//import { randomUUID } from 'crypto';
//import ProjectData from '../api/entities/ProjectData';

//// Initialize Supabase client
//const supabaseUrl = process.env.TOC_SUPABASE_URL!;
//const supabaseKey = process.env.TOC_SUPABASE_SERVICE_ROLE_KEY!;
//const supabase = createClient(supabaseUrl, supabaseKey);

//export interface CreateProjectRequest {
//    userId: string;
//    projectTitle: string;
//    bigPictureGoal?: string;
//    projectAim?: string;
//    objectives?: any[];
//    beneficiaries?: any;
//    activities?: any[];
//    outcomes?: any[];
//    externalFactors?: any[];
//    evidenceLinks?: any[];
//    status?: string;
//}

//export interface UpdateProjectRequest extends CreateProjectRequest {
//    projectId: string;
//}

//export interface ProjectResponse {
//    id: string;
//    user_id: string;
//    project_title: string;
//    big_picture_goal?: string;
//    project_aim?: string;
//    objectives?: any[];
//    beneficiaries?: any;
//    activities?: any[];
//    outcomes?: any[];
//    external_factors?: any[];
//    evidence_links?: any[];
//    status: string;
//    type: string;
//    created_at: string;
//    updated_at: string;
//    blobUrl: string;
//}

//export class ProjectService {

//    /**
//     * Validates mandatory fields for project creation
//     */
//    static validateCreateRequest(data: any): string[] {
//        const errors: string[] = [];

//        if (!data.userId) {
//            errors.push('userId is required');
//        }
//        if (!data.projectTitle) {
//            errors.push('projectTitle is required');
//        }

//        return errors;
//    }

//    /**
//     * Validates mandatory fields for project update
//     */
//    static validateUpdateRequest(data: any): string[] {
//        const errors: string[] = [];

//        if (!data.userId) {
//            errors.push('userId is required');
//        }
//        if (!data.projectId) {
//            errors.push('projectId is required');
//        }
//        if (!data.projectTitle) {
//            errors.push('projectTitle is required');
//        }

//        return errors;
//    }

//    /**
//     * Gets the next project ID for a user by checking existing projects
//     */
//    static async getNextProjectIdForUser(userId: string): Promise<string> {
//        try {
//            // COMMENTED OUT: Database check for existing projects
//            // Get all projects for this user to determine next project ID
//            // const { data: userProjects, error } = await supabase
//            //     .from('projects')
//            //     .select('id')
//            //     .eq('user_id', userId)
//            //     .order('created_at', { ascending: false });

//            // if (error) {
//            //     console.error('Error fetching user projects:', error);
//            //     // Fallback to project_1 if we can't fetch existing projects
//            //     return 'project_1';
//            // }

//            // if (!userProjects || userProjects.length === 0) {
//            //     return 'project_1';
//            // }

//            // // Extract project numbers and find the highest
//            // const projectNumbers = userProjects
//            //     .map(project => {
//            //         // Handle both old UUID format and new project_X format
//            //         const match = project.id.match(/project_(\d+)$/);
//            //         return match ? parseInt(match[1], 10) : 0;
//            //     })
//            //     .filter(num => !isNaN(num) && num > 0);

//            // if (projectNumbers.length === 0) {
//            //     return 'project_1';
//            // }

//            // const highestNumber = Math.max(...projectNumbers);
//            // return `project_${highestNumber + 1}`;

//            // BLOB ONLY: For now, just return project_1 (you can enhance this to check blob storage if needed)
//            return 'project_1';

//        } catch (error) {
//            console.error('Error generating next project ID:', error);
//            // Fallback to project_1 for first project
//            return 'project_1';
//        }
//    }

//    /**
//     * Prepares project data for blob storage
//     */
//    static async prepareProjectData(requestData: CreateProjectRequest, projectId?: string): Promise<any> {
//        const timestamp = new Date().toISOString();

//        // Use provided projectId or generate new one
//        const finalProjectId = projectId || await this.getNextProjectIdForUser(requestData.userId);

//        console.log(`Using project ID for user ${requestData.userId}: ${finalProjectId}`);

//        return {
//            id: finalProjectId,
//            user_id: requestData.userId,
//            project_title: requestData.projectTitle,
//            big_picture_goal: requestData.bigPictureGoal || null,
//            project_aim: requestData.projectAim || null,
//            objectives: requestData.objectives || null,
//            beneficiaries: requestData.beneficiaries || null,
//            activities: requestData.activities || null,
//            outcomes: requestData.outcomes || null,
//            external_factors: requestData.externalFactors || null,
//            evidence_links: requestData.evidenceLinks || null,
//            status: requestData.status || 'draft',
//            type: 'project',
//            created_at: timestamp,
//            updated_at: timestamp
//        };
//    }

//    /**
//     * COMMENTED OUT: Creates a new project in database
//     */
//    // static async createProjectInDB(projectData: any): Promise<{ data: any; error: any }> {
//    //     try {
//    //         const { data: insertedProject, error: dbError } = await supabase
//    //             .from('projects')
//    //             .insert([projectData])
//    //             .select()
//    //             .single();

//    //         return { data: insertedProject, error: dbError };
//    //     } catch (error) {
//    //         console.error('Database insert error:', error);
//    //         return { data: null, error: error };
//    //     }
//    // }

//    /**
//     * COMMENTED OUT: Checks if project exists and belongs to user
//     */
//    // static async validateProjectOwnership(projectId: string, userId: string): Promise<{ exists: boolean; project: any; error: any }> {
//    //     try {
//    //         const { data: existingProject, error: fetchError } = await supabase
//    //             .from('projects')
//    //             .select('*')
//    //             .eq('id', projectId)
//    //             .eq('user_id', userId)
//    //             .single();

//    //         return {
//    //             exists: !fetchError && !!existingProject,
//    //             project: existingProject,
//    //             error: fetchError
//    //         };
//    //     } catch (error) {
//    //         console.error('Project ownership validation error:', error);
//    //         return {
//    //             exists: false,
//    //             project: null,
//    //             error: error
//    //         };
//    //     }
//    // }

//    /**
//     * COMMENTED OUT: Updates project in database
//     */
//    // static async updateProjectInDB(projectId: string, userId: string, updateData: any): Promise<{ data: any; error: any }> {
//    //     try {
//    //         const { data: updatedProject, error: updateError } = await supabase
//    //             .from('projects')
//    //             .update(updateData)
//    //             .eq('id', projectId)
//    //             .eq('user_id', userId)
//    //             .select()
//    //             .single();

//    //         return { data: updatedProject, error: updateError };
//    //     } catch (error) {
//    //         console.error('Database update error:', error);
//    //         return { data: null, error: error };
//    //     }
//    // }

//    /**
//     * Saves project data to blob storage using the correct folder structure
//     * Structure: projects/{userId}/{projectId}.json
//     */
//    static async saveToBlob(userId: string, projectId: string, projectData: any): Promise<{ url: string; error?: any }> {
//        try {
//            const projectWithMeta = {
//                ...projectData,
//                type: 'project',
//                userId: userId,
//                projectId: projectId
//            };

//            // Create folder structure: projects -> userId -> projectId.json
//            const filename = `projects/${userId}/${projectId}.json`;

//            console.log(`Saving to blob with filename: ${filename}`);

//            const { url: blobUrl } = await put(filename, JSON.stringify(projectWithMeta, null, 2), {
//                access: 'public',
//                contentType: 'application/json'
//            });

//            console.log(`Blob saved successfully: ${blobUrl}`);

//            return { url: blobUrl };
//        } catch (error) {
//            console.error('Blob storage error:', error);
//            return { url: '', error };
//        }
//    }

//    /**
//     * Complete create project flow (BLOB ONLY)
//     */
//    static async createProject(requestData: CreateProjectRequest): Promise<ProjectResponse> {
//        try {
//            console.log(`Creating project for user: ${requestData.userId}`);

//            // Prepare project data
//            const projectData = await this.prepareProjectData(requestData);
//            console.log(`Prepared project data with ID: ${projectData.id}`);

//            // COMMENTED OUT: Database operations
//            // // Create in database
//            // const { data: insertedProject, error: dbError } = await this.createProjectInDB(projectData);

//            // if (dbError) {
//            //     throw new Error(`Database error: ${dbError.message || JSON.stringify(dbError)}`);
//            // }

//            // if (!insertedProject) {
//            //     throw new Error('Failed to create project: No data returned from database');
//            // }

//            // console.log(`Project created in DB with ID: ${insertedProject.id}`);

//            // Save to blob storage only
//            const { url: blobUrl, error: blobError } = await this.saveToBlob(
//                requestData.userId,
//                projectData.id,
//                projectData
//            );

//            if (blobError) {
//                throw new Error(`Blob storage error: ${blobError.message || JSON.stringify(blobError)}`);
//            }

//            console.log(`Project creation completed. Blob URL: ${blobUrl}`);

//            return {
//                ...projectData,
//                blobUrl: blobUrl
//            };
//        } catch (error) {
//            console.error('CreateProject error:', error);
//            throw error;
//        }
//    }

//    /**
//     * Complete update project flow (BLOB ONLY)
//     */
//    static async updateProject(requestData: UpdateProjectRequest): Promise<ProjectResponse> {
//        try {
//            console.log(`Updating project ${requestData.projectId} for user: ${requestData.userId}`);

//            // COMMENTED OUT: Database ownership validation
//            // // Check ownership
//            // const { exists, error: ownershipError } = await this.validateProjectOwnership(
//            //     requestData.projectId,
//            //     requestData.userId
//            // );

//            // if (!exists) {
//            //     throw new Error('Project not found or access denied');
//            // }

//            // if (ownershipError) {
//            //     throw new Error(`Ownership validation error: ${ownershipError.message || JSON.stringify(ownershipError)}`);
//            // }

//            // Prepare updated project data (use existing projectId)
//            const updatedProjectData = await this.prepareProjectData(requestData, requestData.projectId);

//            // COMMENTED OUT: Database update
//            // // Update in database
//            // const { data: updatedProject, error: updateError } = await this.updateProjectInDB(
//            //     requestData.projectId,
//            //     requestData.userId,
//            //     updateData
//            // );

//            // if (updateError) {
//            //     throw new Error(`Database update error: ${updateError.message || JSON.stringify(updateError)}`);
//            // }

//            // if (!updatedProject) {
//            //     throw new Error('Failed to update project: No data returned from database');
//            // }

//            // Update blob storage only
//            const { url: blobUrl, error: blobError } = await this.saveToBlob(
//                requestData.userId,
//                requestData.projectId,
//                updatedProjectData
//            );

//            if (blobError) {
//                throw new Error(`Blob storage error: ${blobError.message || JSON.stringify(blobError)}`);
//            }

//            console.log(`Project update completed. Blob URL: ${blobUrl}`);

//            return {
//                ...updatedProjectData,
//                blobUrl: blobUrl
//            };
//        } catch (error) {
//            console.error('UpdateProject error:', error);
//            throw error;
//        }
//    }
//}