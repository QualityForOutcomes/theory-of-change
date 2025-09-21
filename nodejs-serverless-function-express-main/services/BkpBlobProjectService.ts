//import { MongoClient, Db, Collection } from 'mongodb';

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
//    updateName?: boolean;
//}

//export interface BulkProjectData {
//    projectId?: string;
//    projectTitle: string;
//    projectData: {
//        bigPictureGoal?: string;
//        projectAim?: string;
//        objectives?: any[];
//        beneficiaries?: any;
//        activities?: any[];
//        outcomes?: any[];
//        externalFactors?: any[];
//        evidenceLinks?: any[];
//        status?: string;
//    };
//}

//export interface BulkCreateUpdateRequest {
//    userId: string;
//    projects: BulkProjectData[];
//}

//export interface GetProjectsRequest {
//    userId: string;
//    projectId?: string;
//}

//export interface ProjectResponse {
//    userId: string;
//    projectId: string;
//    projectTitle: string;
//    bigPictureGoal?: string;
//    projectAim?: string;
//    objectives?: any[];
//    beneficiaries?: any;
//    activities?: any[];
//    outcomes?: any[];
//    externalFactors?: any[];
//    evidenceLinks?: any[];
//    status: string;
//    type: string;
//    createdAt: string;
//    updatedAt: string;
//}

//export class ProjectService {
//    private static client: MongoClient | null = null;
//    private static db: Db | null = null;

//    private static async getDatabase(): Promise<{ db: Db; collection: Collection }> {
//        if (!this.client) {
//            const uri = process.env.MONGODB_URI;
//            if (!uri) {
//                throw new Error('MONGODB_URI environment variable is not set');
//            }
//            this.client = new MongoClient(uri);
//            await this.client.connect();
//            this.db = this.client.db('myFirstDatabase');
//        }
//        const collection = this.db!.collection('projects');
//        return { db: this.db!, collection };
//    }

//    static validateCreateRequest(data: any): string[] {
//        const errors: string[] = [];
//        if (!data.userId) errors.push('userId is required');
//        if (!data.projectTitle) errors.push('projectTitle is required');
//        return errors;
//    }

//    static validateUpdateRequest(data: any): string[] {
//        const errors: string[] = [];
//        if (!data.userId) errors.push('userId is required');
//        if (!data.projectId) errors.push('projectId is required');
//        if (!data.projectTitle) errors.push('projectTitle is required');
//        return errors;
//    }

//    static async generateUniqueProjectId(userId: string): Promise<string> {
//        try {
//            const { collection } = await this.getDatabase();

//            const projects = await collection
//                .find({ userId: userId })
//                .project({ projectId: 1 })
//                .toArray();

//            const existingIds = projects
//                .map(p => parseInt(p.projectId))
//                .filter(id => !isNaN(id))
//                .sort((a, b) => b - a);

//            const nextId = existingIds.length > 0 ? existingIds[0] + 1 : 1;
//            return nextId.toString();
//        } catch (error) {
//            console.error('Error generating project ID:', error);
//            return '1';
//        }
//    }

//    static async checkProjectTitleExists(userId: string, projectTitle: string, excludeProjectId?: string): Promise<boolean> {
//        try {
//            const { collection } = await this.getDatabase();

//            const query: any = {
//                userId: userId,
//                projectTitle: { $regex: new RegExp(`^${projectTitle}$`, 'i') }
//            };

//            if (excludeProjectId) {
//                query.projectId = { $ne: excludeProjectId };
//            }

//            const existing = await collection.findOne(query);
//            return existing !== null;
//        } catch (error) {
//            console.error('Error checking project title:', error);
//            return false;
//        }
//    }

//    static async getProjectById(userId: string, projectId: string): Promise<ProjectResponse | null> {
//        try {
//            const { collection } = await this.getDatabase();

//            const doc = await collection.findOne({
//                userId: userId,
//                projectId: projectId
//            });

//            if (!doc || !doc.data) return null;

//            return {
//                userId: doc.userId,
//                projectId: doc.projectId,
//                ...doc.data
//            } as ProjectResponse;
//        } catch (error) {
//            console.error('Error getting project:', error);
//            return null;
//        }
//    }

//    static async createProject(requestData: CreateProjectRequest): Promise<ProjectResponse> {
//        try {
//            const titleExists = await this.checkProjectTitleExists(requestData.userId, requestData.projectTitle);
//            if (titleExists) {
//                throw new Error(`Project title "${requestData.projectTitle}" already exists. Please choose a different name.`);
//            }

//            const projectId = await this.generateUniqueProjectId(requestData.userId);
//            const timestamp = new Date().toISOString();

//            const document = {
//                userId: requestData.userId,
//                projectId: projectId,
//                projectTitle: requestData.projectTitle,
//                data: {
//                    projectTitle: requestData.projectTitle,
//                    bigPictureGoal: requestData.bigPictureGoal || null,
//                    projectAim: requestData.projectAim || null,
//                    objectives: requestData.objectives || null,
//                    beneficiaries: requestData.beneficiaries || null,
//                    activities: requestData.activities || null,
//                    outcomes: requestData.outcomes || null,
//                    externalFactors: requestData.externalFactors || null,
//                    evidenceLinks: requestData.evidenceLinks || null,
//                    status: requestData.status || 'draft',
//                    type: 'project',
//                    createdAt: timestamp,
//                    updatedAt: timestamp
//                }
//            };

//            const { collection } = await this.getDatabase();
//            await collection.insertOne(document);

//            return {
//                userId: document.userId,
//                projectId: document.projectId,
//                ...document.data
//            } as ProjectResponse;

//        } catch (error) {
//            console.error('Create project error:', error);
//            throw error;
//        }
//    }

//    static async updateProject(requestData: UpdateProjectRequest): Promise<ProjectResponse> {
//        try {
//            const existing = await this.getProjectById(requestData.userId, requestData.projectId);
//            if (!existing) {
//                throw new Error(`Project ${requestData.projectId} not found for user ${requestData.userId}`);
//            }

//            const isNameChange = existing.projectTitle.toLowerCase() !== requestData.projectTitle.toLowerCase();

//            if (isNameChange) {
//                if (!requestData.updateName) {
//                    throw new Error('Project name change detected. Set updateName: true to confirm.');
//                }

//                const titleExists = await this.checkProjectTitleExists(
//                    requestData.userId,
//                    requestData.projectTitle,
//                    requestData.projectId
//                );
//                if (titleExists) {
//                    throw new Error(`Project title "${requestData.projectTitle}" already exists.`);
//                }
//            }

//            const timestamp = new Date().toISOString();

//            const updatedDocument = {
//                userId: requestData.userId,
//                projectId: requestData.projectId,
//                projectTitle: requestData.projectTitle,
//                data: {
//                    projectTitle: requestData.projectTitle,
//                    bigPictureGoal: requestData.bigPictureGoal || null,
//                    projectAim: requestData.projectAim || null,
//                    objectives: requestData.objectives || null,
//                    beneficiaries: requestData.beneficiaries || null,
//                    activities: requestData.activities || null,
//                    outcomes: requestData.outcomes || null,
//                    externalFactors: requestData.externalFactors || null,
//                    evidenceLinks: requestData.evidenceLinks || null,
//                    status: requestData.status || existing.status,
//                    type: 'project',
//                    createdAt: existing.createdAt,
//                    updatedAt: timestamp
//                }
//            };

//            const { collection } = await this.getDatabase();
//            await collection.replaceOne(
//                { userId: requestData.userId, projectId: requestData.projectId },
//                updatedDocument
//            );

//            return {
//                userId: updatedDocument.userId,
//                projectId: updatedDocument.projectId,
//                ...updatedDocument.data
//            } as ProjectResponse;

//        } catch (error) {
//            console.error('Update project error:', error);
//            throw error;
//        }
//    }

//    static async listUserProjects(userId: string): Promise<ProjectResponse[]> {
//        try {
//            const { collection } = await this.getDatabase();

//            const docs = await collection
//                .find({ userId: userId })
//                .sort({ 'data.createdAt': -1 })
//                .toArray();

//            return docs.map(doc => ({
//                userId: doc.userId,
//                projectId: doc.projectId,
//                ...doc.data
//            } as ProjectResponse));

//        } catch (error) {
//            console.error('List projects error:', error);
//            throw error;
//        }
//    }

//    static async bulkCreateUpdateProjects(requestData: BulkCreateUpdateRequest): Promise<ProjectResponse[]> {
//        try {
//            const results: ProjectResponse[] = [];

//            for (const projectData of requestData.projects) {
//                try {
//                    if (projectData.projectId) {
//                        const updateRequest: UpdateProjectRequest = {
//                            userId: requestData.userId,
//                            projectId: projectData.projectId,
//                            projectTitle: projectData.projectTitle,
//                            ...projectData.projectData,
//                            updateName: true
//                        };

//                        const updated = await this.updateProject(updateRequest);
//                        results.push(updated);
//                    } else {
//                        const createRequest: CreateProjectRequest = {
//                            userId: requestData.userId,
//                            projectTitle: projectData.projectTitle,
//                            ...projectData.projectData
//                        };

//                        const created = await this.createProject(createRequest);
//                        results.push(created);
//                    }
//                } catch (error) {
//                    console.error(`Error processing project "${projectData.projectTitle}":`, error);
//                    throw new Error(`Failed to process project "${projectData.projectTitle}": ${error.message}`);
//                }
//            }

//            return results;
//        } catch (error) {
//            console.error('Bulk create/update error:', error);
//            throw error;
//        }
//    }

//    static async getProjects(requestData: GetProjectsRequest): Promise<ProjectResponse | ProjectResponse[]> {
//        try {
//            if (requestData.projectId) {
//                const project = await this.getProjectById(requestData.userId, requestData.projectId);
//                if (!project) {
//                    throw new Error(`Project ${requestData.projectId} not found for user ${requestData.userId}`);
//                }
//                return project;
//            } else {
//                const projects = await this.listUserProjects(requestData.userId);
//                return projects;
//            }
//        } catch (error) {
//            console.error('Get projects error:', error);
//            throw error;
//        }
//    }

//    static async deleteProject(userId: string, projectId: string): Promise<boolean> {
//        try {
//            const { collection } = await this.getDatabase();

//            const result = await collection.deleteOne({
//                userId: userId,
//                projectId: projectId
//            });

//            return result.deletedCount > 0;
//        } catch (error) {
//            console.error('Delete project error:', error);
//            throw error;
//        }
//    }

//    static async closeConnection(): Promise<void> {
//        if (this.client) {
//            await this.client.close();
//            this.client = null;
//            this.db = null;
//        }
//    }
//}