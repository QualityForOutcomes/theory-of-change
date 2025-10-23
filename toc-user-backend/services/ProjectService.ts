/**
 * Project Service
 * 
 * Handles all project-related database operations for MongoDB.
 * Manages CRUD operations for projects including:
 * - Creating new projects with unique IDs
 * - Retrieving single or multiple projects
 * - Updating project data with validation
 * - Deleting projects
 * - Managing Theory of Change (ToC) data and color configurations
 * 
 * Uses MongoDB client for database operations with connection pooling.
 */
import { MongoClient, Db, Collection } from 'mongodb';
import CreateProjectRequest from '../entities/project/CreateProjectRequest';
import GetProjectsRequest from '../entities/project/GetProjectsRequest';
import ProjectData from '../entities/project/ProjectData';
import UpdateProjectRequest from '../entities/project/UpdateProjectRequest';

export class ProjectService {

    /** Valid ToC sections for validation */
    private static readonly VALID_TOC_SECTIONS = [
        'bigPictureGoal',
        'projectAim',
        'activities',
        'objectives',
        'beneficiaries',
        'outcomes',
        'externalFactors',
        'evidenceLinks'
    ] as const;

    /** MongoDB client instance (singleton) */
    private static client: MongoClient | null = null;

    /** MongoDB database instance (singleton) */
    private static db: Db | null = null;

    /**
     * Gets or creates MongoDB database connection
     * 
     * Uses singleton pattern to maintain a single connection.
     * Initializes connection if not already established.
     * 
     * @returns Database and collection instances
     * @throws Error if MONGODB_URI environment variable is not set
     * @private
     */
    private static async getDatabase(): Promise<{ db: Db; collection: Collection }> {
        if (!this.client) {
            const uri = process.env.MONGODB_URI;
            if (!uri) {
                throw new Error('MONGODB_URI environment variable is not set');
            }

            console.log('Initializing MongoDB connection...');
            this.client = new MongoClient(uri);
            await this.client.connect();
            this.db = this.client.db(process.env.MONGODB_DB);
            console.log('MongoDB connection established');
        }

        const collection = this.db!.collection(process.env.MONGODB_COLLECTION_NAME || "projects");
        return { db: this.db!, collection };
    }

    /**
     * Returns default ToC color configuration
     * 
     * Creates a default color configuration with empty strings
     * for both shape and text colors for all ToC sections.
     * 
     * @returns Default ToC color configuration object
     */
    static getDefaultTocColor(): Record<string, { shape: string; text: string }> {
        const defaultSection = { shape: '', text: '' };
        return {
            bigPictureGoal: defaultSection,
            projectAim: defaultSection,
            activities: defaultSection,
            objectives: defaultSection,
            beneficiaries: defaultSection,
            outcomes: defaultSection,
            externalFactors: defaultSection,
            evidenceLinks: defaultSection
        };
    }

    /**
     * Validates ToC color configuration format
     * 
     * Ensures tocColor object has correct structure with all required
     * sections containing both 'shape' and 'text' properties.
     * 
     * @param tocColor - ToC color object to validate
     * @returns True if format is valid, false otherwise
     */
    static validateTocColorFormat(tocColor: unknown): boolean {
        if (!tocColor || typeof tocColor !== 'object') {
            console.warn('Invalid tocColor: not an object');
            return false;
        }

        const tocColorObj = tocColor as Record<string, unknown>;

        for (const section of Object.keys(tocColorObj)) {
            // Skip non-ToC sections
            if (!this.VALID_TOC_SECTIONS.includes(section as any)) continue;

            const sectionData = tocColorObj[section];
            if (!sectionData || typeof sectionData !== 'object') {
                console.warn(`Invalid tocColor section: ${section} is not an object`);
                return false;
            }

            const sectionObj = sectionData as Record<string, unknown>;

            // Check if shape and text properties exist (can be empty strings)
            if (!sectionObj.hasOwnProperty('shape') || !sectionObj.hasOwnProperty('text')) {
                console.warn(`Invalid tocColor section: ${section} missing shape or text property`);
                return false;
            }
        }

        return true;
    }

    /**
     * Validates create project request data
     * 
     * Ensures all required fields are present and valid for project creation.
     * 
     * @param data - Create project request data to validate
     * @returns Array of validation error messages (empty if valid)
     */
    static validateCreateRequest(data: CreateProjectRequest): string[] {
        const errors: string[] = [];

        if (!data.projectTitle) {
            errors.push('projectTitle is required');
        }

        // Validate tocColor format if provided
        if (data.tocColor && !this.validateTocColorFormat(data.tocColor)) {
            errors.push('tocColor format is invalid');
        }

        return errors;
    }

    /**
     * Validates update project request data
     * 
     * Ensures all required fields are present and valid for project updates.
     * 
     * @param data - Update project request data to validate
     * @returns Array of validation error messages (empty if valid)
     */
    static validateUpdateRequest(data: UpdateProjectRequest): string[] {
        const errors: string[] = [];

        if (!data.projectId) {
            errors.push('projectId is required');
        }
        if (!data.projectTitle) {
            errors.push('projectTitle is required');
        }

        // Validate tocColor format if provided
        if (data.tocColor && !this.validateTocColorFormat(data.tocColor)) {
            errors.push('tocColor format is invalid');
        }

        return errors;
    }

    /**
     * Generates unique sequential project ID for a user
     * 
     * Finds the highest existing project ID for the user and increments it.
     * Falls back to '1' if no projects exist or on error.
     * 
     * @param userId - User ID to generate project ID for
     * @returns Sequential project ID as string
     */
    static async generateUniqueProjectId(userId: string): Promise<string> {
        try {
            console.log(`Generating unique project ID for user: ${userId}`);
            const { collection } = await this.getDatabase();

            // Fetch all project IDs for this user
            const projects = await collection
                .find({ userId: userId })
                .project({ projectId: 1 })
                .toArray();

            // Extract numeric IDs and sort descending
            const existingIds = projects
                .map(p => parseInt(p.projectId as string))
                .filter(id => !isNaN(id))
                .sort((a, b) => b - a);

            const nextId = existingIds.length > 0 ? existingIds[0] + 1 : 1;
            console.log(`Generated project ID: ${nextId}`);

            return nextId.toString();
        } catch (error: unknown) {
            console.error('Error generating project ID:', error);
            return '1';
        }
    }

    /**
     * Checks if a project title already exists for a user
     * 
     * Performs case-insensitive search to prevent duplicate titles.
     * Optionally excludes a specific project ID (useful for updates).
     * 
     * @param userId - User ID to check against
     * @param projectTitle - Project title to check
     * @param excludeProjectId - Optional project ID to exclude from check
     * @returns True if title exists, false otherwise
     */
    static async checkProjectTitleExists(
        userId: string,
        projectTitle: string,
        excludeProjectId?: string
    ): Promise<boolean> {
        try {
            console.log(`Checking if project title exists: "${projectTitle}" for user: ${userId}`);
            const { collection } = await this.getDatabase();

            const query: Record<string, unknown> = {
                userId: userId,
                projectTitle: { $regex: new RegExp(`^${projectTitle}$`, 'i') }
            };

            // Exclude specific project ID if provided (for updates)
            if (excludeProjectId) {
                query.projectId = { $ne: excludeProjectId };
            }

            const existing = await collection.findOne(query);
            const exists = existing !== null;

            console.log(`Project title "${projectTitle}" exists: ${exists}`);
            return exists;
        } catch (error: unknown) {
            console.error('Error checking project title:', error);
            return false;
        }
    }

    /**
     * Retrieves a single project by ID for a specific user
     * 
     * Transforms MongoDB document to ProjectData format.
     * Returns null if project not found.
     * 
     * @param userId - User ID who owns the project
     * @param projectId - Project ID to retrieve
     * @returns Project data or null if not found
     */
    static async getProjectById(userId: string, projectId: string): Promise<ProjectData | null> {
        try {
            console.log(`Fetching project: ${projectId} for user: ${userId}`);
            const { collection } = await this.getDatabase();

            const doc = await collection.findOne({
                userId: userId,
                projectId: projectId
            });

            if (!doc) {
                console.log(`Project not found: ${projectId}`);
                return null;
            }

            console.log(`Project retrieved successfully: ${projectId}`);

            // Transform document to match ProjectData structure
            return {
                projectId: doc.projectId,
                status: doc.status,
                type: doc.type,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                tocData: {
                    projectTitle: doc.tocData?.projectTitle || doc.projectTitle,
                    bigPictureGoal: doc.tocData?.bigPictureGoal,
                    projectAim: doc.tocData?.projectAim,
                    objectives: doc.tocData?.objectives,
                    beneficiaries: doc.tocData?.beneficiaries,
                    activities: doc.tocData?.activities,
                    outcomes: doc.tocData?.outcomes,
                    externalFactors: doc.tocData?.externalFactors,
                    evidenceLinks: doc.tocData?.evidenceLinks
                },
                tocColor: doc.tocColor || this.getDefaultTocColor()
            } as ProjectData;
        } catch (error: unknown) {
            console.error('Error getting project:', error);
            return null;
        }
    }

    /**
     * Creates a new project in MongoDB
     * 
     * Process:
     * 1. Validates project title uniqueness
     * 2. Generates unique project ID
     * 3. Creates project document with ToC data
     * 4. Inserts into MongoDB
     * 5. Returns created project data
     * 
     * @param requestData - Project creation request data
     * @returns Created project data
     * @throws Error if title already exists or database operation fails
     */
    static async createProject(requestData: CreateProjectRequest): Promise<ProjectData> {
        try {
            console.log(`Creating project: "${requestData.projectTitle}" for user: ${requestData.userId}`);

            // Check for duplicate project title
            const titleExists = await this.checkProjectTitleExists(
                requestData.userId,
                requestData.projectTitle
            );

            if (titleExists) {
                throw new Error(
                    `Project title "${requestData.projectTitle}" already exists. Please choose a different name.`
                );
            }

            // Generate unique sequential ID
            const projectId = await this.generateUniqueProjectId(requestData.userId);
            const timestamp = new Date().toISOString();

            // Build MongoDB document
            const document = {
                userId: requestData.userId,
                projectId: projectId,
                projectTitle: requestData.projectTitle,
                status: requestData.status || 'draft',
                type: 'project',
                createdAt: timestamp,
                updatedAt: timestamp,
                tocData: {
                    projectTitle: requestData.projectTitle,
                    bigPictureGoal: requestData.bigPictureGoal || null,
                    projectAim: requestData.projectAim || null,
                    objectives: requestData.objectives || null,
                    beneficiaries: requestData.beneficiaries || null,
                    activities: requestData.activities || null,
                    outcomes: requestData.outcomes || null,
                    externalFactors: requestData.externalFactors || null,
                    evidenceLinks: requestData.evidenceLinks || null
                },
                tocColor: requestData.tocColor || this.getDefaultTocColor(),
            };

            // Insert into MongoDB
            const { collection } = await this.getDatabase();
            await collection.insertOne(document);

            console.log(`Project created successfully with ID: ${projectId}`);

            // Return data in ProjectData format
            return {
                projectId: document.projectId,
                status: document.status,
                type: document.type,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
                tocData: document.tocData,
                tocColor: document.tocColor
            } as ProjectData;

        } catch (error: unknown) {
            console.error('Create project error:', error);
            throw error;
        }
    }

    /**
     * Updates an existing project in MongoDB
     * 
     * Process:
     * 1. Validates project exists
     * 2. Checks for title changes and validates uniqueness
     * 3. Merges ToC data (preserves existing values if not provided)
     * 4. Deep merges ToC color configuration
     * 5. Replaces document in MongoDB
     * 6. Returns updated project data
     * 
     * @param requestData - Project update request data
     * @returns Updated project data
     * @throws Error if project not found, title exists, or database operation fails
     */
    static async updateProject(requestData: UpdateProjectRequest): Promise<ProjectData> {
        try {
            console.log(`Updating project: ${requestData.projectId} for user: ${requestData.userId}`);

            // Fetch existing project
            const existing = await this.getProjectById(requestData.userId, requestData.projectId);
            if (!existing) {
                throw new Error(
                    `Project ${requestData.projectId} not found for user ${requestData.userId}`
                );
            }

            // Check if project title is being changed
            const isNameChange = existing.tocData.projectTitle.trim() !== requestData.projectTitle.trim();

            if (isNameChange) {
                // Require explicit confirmation for name changes
                if (!requestData.updateName) {
                    throw new Error('Project name change detected. Set updateName: true to confirm.');
                }

                // Validate new title uniqueness
                const titleExists = await this.checkProjectTitleExists(
                    requestData.userId,
                    requestData.projectTitle,
                    requestData.projectId
                );

                if (titleExists) {
                    throw new Error(`Project title "${requestData.projectTitle}" already exists.`);
                }

                console.log(`Project title changing from "${existing.tocData.projectTitle}" to "${requestData.projectTitle}"`);
            }

            const timestamp = new Date().toISOString();

            // Handle tocData updates - only update fields explicitly provided
            const tocData = requestData.tocData;

            // Deep merge tocColor to preserve nested structure
            let updatedTocColor = existing.tocColor || this.getDefaultTocColor();
            if (requestData.tocColor) {
                const defaultSection = { shape: '', text: '' };

                // Merge each section individually to preserve structure
                updatedTocColor = {
                    bigPictureGoal: {
                        ...defaultSection,
                        ...updatedTocColor.bigPictureGoal,
                        ...requestData.tocColor.bigPictureGoal
                    },
                    projectAim: {
                        ...defaultSection,
                        ...updatedTocColor.projectAim,
                        ...requestData.tocColor.projectAim
                    },
                    activities: {
                        ...defaultSection,
                        ...updatedTocColor.activities,
                        ...requestData.tocColor.activities
                    },
                    objectives: {
                        ...defaultSection,
                        ...updatedTocColor.objectives,
                        ...requestData.tocColor.objectives
                    },
                    beneficiaries: {
                        ...defaultSection,
                        ...updatedTocColor.beneficiaries,
                        ...requestData.tocColor.beneficiaries
                    },
                    outcomes: {
                        ...defaultSection,
                        ...updatedTocColor.outcomes,
                        ...requestData.tocColor.outcomes
                    },
                    externalFactors: {
                        ...defaultSection,
                        ...updatedTocColor.externalFactors,
                        ...requestData.tocColor.externalFactors
                    },
                    evidenceLinks: {
                        ...defaultSection,
                        ...updatedTocColor.evidenceLinks,
                        ...requestData.tocColor.evidenceLinks
                    }
                };
            }

            // Build updated document with merged data
            const updatedDocument = {
                userId: requestData.userId,
                projectId: requestData.projectId,
                projectTitle: requestData.projectTitle,
                status: requestData.status || existing.status,
                type: 'project',
                createdAt: existing.createdAt,
                updatedAt: timestamp,
                tocData: {
                    projectTitle: requestData.projectTitle,
                    bigPictureGoal: (tocData && tocData.hasOwnProperty('bigPictureGoal'))
                        ? tocData.bigPictureGoal
                        : existing.tocData.bigPictureGoal,
                    projectAim: (tocData && tocData.hasOwnProperty('projectAim'))
                        ? tocData.projectAim
                        : existing.tocData.projectAim,
                    objectives: (tocData && tocData.hasOwnProperty('objectives'))
                        ? tocData.objectives
                        : existing.tocData.objectives,
                    beneficiaries: (tocData && tocData.hasOwnProperty('beneficiaries'))
                        ? tocData.beneficiaries
                        : existing.tocData.beneficiaries,
                    activities: (tocData && tocData.hasOwnProperty('activities'))
                        ? tocData.activities
                        : existing.tocData.activities,
                    outcomes: (tocData && tocData.hasOwnProperty('outcomes'))
                        ? tocData.outcomes
                        : existing.tocData.outcomes,
                    externalFactors: (tocData && tocData.hasOwnProperty('externalFactors'))
                        ? tocData.externalFactors
                        : existing.tocData.externalFactors,
                    evidenceLinks: (tocData && tocData.hasOwnProperty('evidenceLinks'))
                        ? tocData.evidenceLinks
                        : existing.tocData.evidenceLinks
                },
                tocColor: updatedTocColor
            };

            // Replace document in MongoDB
            const { collection } = await this.getDatabase();
            await collection.replaceOne(
                { userId: requestData.userId, projectId: requestData.projectId },
                updatedDocument
            );

            console.log(`Project updated successfully: ${requestData.projectId}`);

            // Return data in ProjectData format
            return {
                projectId: updatedDocument.projectId,
                status: updatedDocument.status,
                type: updatedDocument.type,
                createdAt: updatedDocument.createdAt,
                updatedAt: updatedDocument.updatedAt,
                tocData: updatedDocument.tocData,
                tocColor: updatedDocument.tocColor
            } as ProjectData;

        } catch (error: unknown) {
            console.error('Update project error:', error);
            throw error;
        }
    }

    /**
     * Lists all projects for a specific user
     * 
     * Returns projects sorted by creation date (newest first).
     * Transforms MongoDB documents to ProjectData format.
     * 
     * @param userId - User ID to fetch projects for
     * @returns Array of project data sorted by creation date
     */
    static async listUserProjects(userId: string): Promise<ProjectData[]> {
        try {
            console.log(`Listing all projects for user: ${userId}`);
            const { collection } = await this.getDatabase();

            const docs = await collection
                .find({ userId: userId })
                .sort({ 'createdAt': -1 })
                .toArray();

            console.log(`Found ${docs.length} projects for user: ${userId}`);

            // Transform each document to ProjectData structure
            return docs.map(doc => ({
                projectId: doc.projectId,
                status: doc.status,
                type: doc.type,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                tocData: {
                    projectTitle: doc.tocData?.projectTitle || doc.projectTitle,
                    bigPictureGoal: doc.tocData?.bigPictureGoal,
                    projectAim: doc.tocData?.projectAim,
                    objectives: doc.tocData?.objectives,
                    beneficiaries: doc.tocData?.beneficiaries,
                    activities: doc.tocData?.activities,
                    outcomes: doc.tocData?.outcomes,
                    externalFactors: doc.tocData?.externalFactors,
                    evidenceLinks: doc.tocData?.evidenceLinks
                },
                tocColor: doc.tocColor || this.getDefaultTocColor()
            } as ProjectData));

        } catch (error: unknown) {
            console.error('List projects error:', error);
            throw error;
        }
    }

    /**
     * Gets project(s) based on request parameters
     * 
     * If projectId is provided, returns single project.
     * If projectId is omitted, returns all user projects.
     * 
     * @param requestData - Get projects request with optional projectId
     * @returns Single project or array of projects
     * @throws Error if specified project not found
     */
    static async getProjects(requestData: GetProjectsRequest): Promise<ProjectData | ProjectData[]> {
        try {
            if (requestData.projectId) {
                console.log(`Getting single project: ${requestData.projectId}`);
                const project = await this.getProjectById(requestData.userId, requestData.projectId);

                if (!project) {
                    throw new Error(
                        `Project ${requestData.projectId} not found for user ${requestData.userId}`
                    );
                }

                return project;
            } else {
                console.log(`Getting all projects for user: ${requestData.userId}`);
                const projects = await this.listUserProjects(requestData.userId);
                return projects;
            }
        } catch (error: unknown) {
            console.error('Get projects error:', error);
            throw error;
        }
    }

    /**
     * Deletes a project from MongoDB
     * 
     * @param userId - User ID who owns the project
     * @param projectId - Project ID to delete
     * @returns True if project was deleted, false if not found
     */
    static async deleteProject(userId: string, projectId: string): Promise<boolean> {
        try {
            console.log(`Deleting project: ${projectId} for user: ${userId}`);
            const { collection } = await this.getDatabase();

            const result = await collection.deleteOne({
                userId: userId,
                projectId: projectId
            });

            const deleted = result.deletedCount > 0;
            console.log(`Project deletion ${deleted ? 'successful' : 'failed'}: ${projectId}`);

            return deleted;
        } catch (error: unknown) {
            console.error('Delete project error:', error);
            throw error;
        }
    }

    /**
     * Closes MongoDB connection
     * 
     * Should be called during application shutdown.
     * Clears singleton instances.
     */
    static async closeConnection(): Promise<void> {
        if (this.client) {
            console.log('Closing MongoDB connection...');
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('MongoDB connection closed');
        }
    }
}