/**
 * Project Service Tests
 *
 * Focuses on CRUD logic, ID generation, validation, and MongoDB interaction flow.
 * Mocks the entire 'mongodb' module to prevent actual database connections.
 */

// --- MOCK MONGODB DEPENDENCIES ---
const mockFind = {
    project: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    toArray: jest.fn(),
    limit: jest.fn().mockReturnThis(),
};

const mockCollection = {
    find: jest.fn(() => mockFind),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    replaceOne: jest.fn(),
    deleteOne: jest.fn(),
};

const mockDb = {
    collection: jest.fn(() => mockCollection),
};

const mockClient = {
    connect: jest.fn(),
    db: jest.fn(() => mockDb),
    close: jest.fn(),
};

const mockMongoClient = {
    MongoClient: jest.fn(() => mockClient),
    Db: function () { }, // Mock constructor for typing
    Collection: function () { } // Mock constructor for typing
};

// Mock the external 'mongodb' package
jest.mock('mongodb', () => mockMongoClient);

// Set required environment variables for the service to initialize
process.env.MONGODB_URI = 'mongodb://mock-uri';
process.env.MONGODB_DB = 'mock-db';
process.env.MONGODB_COLLECTION_NAME = 'projects';

// Import the module to be tested
const { ProjectService } = require('../../services/ProjectService');

// --- MOCK DATA ---

const MOCK_USER_ID = 'user-abc-123';
const MOCK_PROJECT_ID = '3';
const MOCK_TIMESTAMP = new Date('2024-01-01T10:00:00.000Z').toISOString();
const MOCK_PROJECT_TITLE = 'My Test Project';

const MOCK_TOC_COLOR = {
    bigPictureGoal: { shape: '#FF0000', text: '#FFFFFF' },
    projectAim: { shape: '#00FF00', text: '#000000' },
    activities: { shape: '', text: '' },
    objectives: { shape: '', text: '' },
    beneficiaries: { shape: '', text: '' },
    outcomes: { shape: '', text: '' },
    externalFactors: { shape: '', text: '' },
    evidenceLinks: { shape: '', text: '' },
};

const MOCK_DEFAULT_TOC_COLOR = ProjectService.getDefaultTocColor();

const MOCK_CREATE_REQUEST = {
    userId: MOCK_USER_ID,
    projectTitle: MOCK_PROJECT_TITLE,
    bigPictureGoal: 'End poverty',
    tocColor: MOCK_TOC_COLOR,
};

const MOCK_DB_PROJECT = {
    userId: MOCK_USER_ID,
    projectId: MOCK_PROJECT_ID,
    projectTitle: MOCK_PROJECT_TITLE,
    status: 'draft',
    type: 'project',
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
    tocData: {
        projectTitle: MOCK_PROJECT_TITLE,
        bigPictureGoal: 'End poverty',
        projectAim: null,
        objectives: null,
        beneficiaries: null,
        activities: null,
        outcomes: null,
        externalFactors: null,
        evidenceLinks: null,
    },
    tocColor: MOCK_TOC_COLOR,
};

const MOCK_PROJECT_DATA = {
    projectId: MOCK_PROJECT_ID,
    status: 'draft',
    type: 'project',
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
    tocData: MOCK_DB_PROJECT.tocData,
    tocColor: MOCK_TOC_COLOR,
};


describe('ProjectService', () => {
    // Override Date globally to fix timestamps for predictable testing
    const realDate = Date;
    beforeAll(() => {
        global.Date = class extends realDate {
            constructor(arg) {
                if (arg) return new realDate(arg);
                return new realDate(MOCK_TIMESTAMP);
            }
        };
    });

    afterAll(() => {
        global.Date = realDate;
    });

    beforeEach(() => {
        // Clear all mocks for a clean slate
        jest.clearAllMocks();
        // Reset the internal singleton state before each test
        // This is necessary because the static properties client and db persist state
        ProjectService.client = null;
        ProjectService.db = null;
    });

    // =========================================================================
    // Helper & Validation Tests
    // =========================================================================

    describe('Static Helpers & Validation', () => {
        it('getDefaultTocColor should return the correct default structure', () => {
            const defaults = ProjectService.getDefaultTocColor();
            expect(Object.keys(defaults).length).toBe(8);
            expect(defaults.bigPictureGoal).toEqual({ shape: '', text: '' });
            expect(defaults.activities).toEqual({ shape: '', text: '' });
        });

        describe('validateTocColorFormat', () => {
            it('should return true for a valid, complete tocColor object', () => {
                expect(ProjectService.validateTocColorFormat(MOCK_TOC_COLOR)).toBe(true);
            });

            it('should return true if only a subset of sections are provided', () => {
                const partialColor = { projectAim: { shape: '#111', text: '#222' } };
                expect(ProjectService.validateTocColorFormat(partialColor)).toBe(true);
            });

            it('should return false for null or non-object input', () => {
                expect(ProjectService.validateTocColorFormat(null)).toBe(false);
                expect(ProjectService.validateTocColorFormat('invalid')).toBe(false);
            });

            it('should return false if a section is missing shape or text properties', () => {
                const invalidColor = { bigPictureGoal: { shape: '#FFF' } };
                expect(ProjectService.validateTocColorFormat(invalidColor)).toBe(false);
            });
        });

        describe('validateCreateRequest', () => {
            it('should return an empty array for a valid request', () => {
                expect(ProjectService.validateCreateRequest(MOCK_CREATE_REQUEST)).toEqual([]);
            });

            it('should return error if projectTitle is missing', () => {
                const request = { ...MOCK_CREATE_REQUEST, projectTitle: '' };
                expect(ProjectService.validateCreateRequest(request)).toContain('projectTitle is required');
            });

            it('should return error if tocColor is invalid', () => {
                const request = { ...MOCK_CREATE_REQUEST, tocColor: { projectAim: { text: '#111' } } };
                expect(ProjectService.validateCreateRequest(request)).toContain('tocColor format is invalid');
            });
        });

        describe('validateUpdateRequest', () => {
            it('should return an empty array for a valid request', () => {
                const request = { ...MOCK_CREATE_REQUEST, projectId: MOCK_PROJECT_ID };
                expect(ProjectService.validateUpdateRequest(request)).toEqual([]);
            });

            it('should return error if projectId is missing', () => {
                const request = { ...MOCK_CREATE_REQUEST, projectId: '' };
                expect(ProjectService.validateUpdateRequest(request)).toContain('projectId is required');
            });
        });
    });

    // =========================================================================
    // Core Logic Tests
    // =========================================================================

    describe('generateUniqueProjectId', () => {
        it('should return "1" if no projects exist for the user', async () => {
            mockFind.toArray.mockResolvedValue([]);

            const nextId = await ProjectService.generateUniqueProjectId(MOCK_USER_ID);

            expect(nextId).toBe('1');
            expect(mockCollection.find).toHaveBeenCalledWith({ userId: MOCK_USER_ID });
        });

        it('should return the next sequential ID when projects exist', async () => {
            const existingProjects = [
                { projectId: '5', _id: 'a' },
                { projectId: '3', _id: 'b' },
                { projectId: '9', _id: 'c' },
                { projectId: 'invalid', _id: 'd' }, // Ensure non-numeric IDs are ignored
            ];
            mockFind.toArray.mockResolvedValue(existingProjects);

            const nextId = await ProjectService.generateUniqueProjectId(MOCK_USER_ID);

            // Highest existing ID is 9, so next should be 10
            expect(nextId).toBe('10');
        });

        it('should fall back to "1" on database error', async () => {
            mockFind.toArray.mockRejectedValue(new Error('Mongo read error'));

            const nextId = await ProjectService.generateUniqueProjectId(MOCK_USER_ID);

            expect(nextId).toBe('1');
        });
    });

    describe('checkProjectTitleExists', () => {
        it('should return true if title exists for the user', async () => {
            mockCollection.findOne.mockResolvedValue(MOCK_DB_PROJECT); // Found a match

            const exists = await ProjectService.checkProjectTitleExists(MOCK_USER_ID, MOCK_PROJECT_TITLE);

            expect(exists).toBe(true);
            expect(mockCollection.findOne).toHaveBeenCalledWith({
                userId: MOCK_USER_ID,
                projectTitle: { $regex: new RegExp(`^${MOCK_PROJECT_TITLE}$`, 'i') }
            });
        });

        it('should return false if title does not exist', async () => {
            mockCollection.findOne.mockResolvedValue(null); // No match found

            const exists = await ProjectService.checkProjectTitleExists(MOCK_USER_ID, 'New Title');

            expect(exists).toBe(false);
        });

        it('should exclude a specific projectId during update checks', async () => {
            mockCollection.findOne.mockResolvedValue(null);
            const excludeId = '2';

            await ProjectService.checkProjectTitleExists(MOCK_USER_ID, MOCK_PROJECT_TITLE, excludeId);

            expect(mockCollection.findOne).toHaveBeenCalledWith(expect.objectContaining({
                projectId: { $ne: excludeId }
            }));
        });
    });

    describe('getProjectById', () => {
        it('should successfully retrieve and map an existing project', async () => {
            mockCollection.findOne.mockResolvedValue(MOCK_DB_PROJECT);

            const project = await ProjectService.getProjectById(MOCK_USER_ID, MOCK_PROJECT_ID);

            expect(project).toEqual(MOCK_PROJECT_DATA);
            expect(mockCollection.findOne).toHaveBeenCalledWith({
                userId: MOCK_USER_ID,
                projectId: MOCK_PROJECT_ID
            });
        });

        it('should return null if project is not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            const project = await ProjectService.getProjectById(MOCK_USER_ID, '999');

            expect(project).toBeNull();
        });

        it('should return null on database error', async () => {
            mockCollection.findOne.mockRejectedValue(new Error('Mongo timeout'));

            const project = await ProjectService.getProjectById(MOCK_USER_ID, MOCK_PROJECT_ID);

            expect(project).toBeNull();
        });
    });

    // =========================================================================
    // CRUD Tests
    // =========================================================================

    describe('createProject', () => {
        it('should successfully create a project and return ProjectData', async () => {
            // Mock title check: does not exist
            ProjectService.checkProjectTitleExists = jest.fn().mockResolvedValue(false);
            // Mock ID generation: next ID is 1
            ProjectService.generateUniqueProjectId = jest.fn().mockResolvedValue('1');
            // Mock DB insert
            mockCollection.insertOne.mockResolvedValue({ acknowledged: true, insertedId: 'mockObjectId' });

            const createdProject = await ProjectService.createProject(MOCK_CREATE_REQUEST);

            expect(ProjectService.checkProjectTitleExists).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_PROJECT_TITLE);
            expect(ProjectService.generateUniqueProjectId).toHaveBeenCalledWith(MOCK_USER_ID);
            expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
                projectId: '1',
                userId: MOCK_USER_ID,
                projectTitle: MOCK_PROJECT_TITLE,
                createdAt: MOCK_TIMESTAMP,
                tocColor: MOCK_TOC_COLOR,
            }));
            expect(createdProject.projectId).toBe('1');
            expect(createdProject.tocData.bigPictureGoal).toBe('End poverty');
        });

        it('should use default tocColor if none is provided in the request', async () => {
            const minimalRequest = {
                userId: MOCK_USER_ID,
                projectTitle: 'Minimal Project',
            };
            ProjectService.checkProjectTitleExists = jest.fn().mockResolvedValue(false);
            ProjectService.generateUniqueProjectId = jest.fn().mockResolvedValue('1');
            mockCollection.insertOne.mockResolvedValue({ acknowledged: true, insertedId: 'mockObjectId' });

            const createdProject = await ProjectService.createProject(minimalRequest);

            expect(mockCollection.insertOne.mock.calls[0][0].tocColor).toEqual(MOCK_DEFAULT_TOC_COLOR);
            expect(createdProject.tocColor).toEqual(MOCK_DEFAULT_TOC_COLOR);
        });

        it('should throw an error if the project title already exists', async () => {
            ProjectService.checkProjectTitleExists = jest.fn().mockResolvedValue(true);

            await expect(ProjectService.createProject(MOCK_CREATE_REQUEST)).rejects.toThrow(
                `Project title "${MOCK_PROJECT_TITLE}" already exists. Please choose a different name.`
            );
        });
    });

    describe('updateProject', () => {
        const MOCK_UPDATE_REQUEST = {
            userId: MOCK_USER_ID,
            projectId: MOCK_PROJECT_ID,
            projectTitle: 'Updated Project Title', // Name changed
            updateName: true,
            status: 'complete',
            tocData: {
                projectAim: 'New Aim', // Specific ToC update
                objectives: 'Updated Objectives',
            },
            tocColor: {
                projectAim: { shape: '#0000FF' }, // Partial color update
            }
        };

        const MOCK_EXISTING_PROJECT = {
            ...MOCK_PROJECT_DATA,
            projectId: MOCK_PROJECT_ID,
            tocData: { ...MOCK_DB_PROJECT.tocData, projectTitle: 'Old Title' },
            tocColor: { ...MOCK_DEFAULT_TOC_COLOR, bigPictureGoal: { shape: '#AAA', text: '#BBB' } },
        };

        it('should successfully update project data including merging tocData and tocColor', async () => {
            // Mock dependencies:
            ProjectService.getProjectById = jest.fn().mockResolvedValue(MOCK_EXISTING_PROJECT);
            ProjectService.checkProjectTitleExists = jest.fn().mockResolvedValue(false);
            mockCollection.replaceOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

            const updatedProject = await ProjectService.updateProject(MOCK_UPDATE_REQUEST);

            const expectedTocColor = {
                ...MOCK_DEFAULT_TOC_COLOR, // Default structure
                bigPictureGoal: { shape: '#AAA', text: '#BBB' }, // Existing value preserved
                projectAim: { shape: '#0000FF', text: '' }, // New shape merged, old text preserved (default empty)
            };

            const expectedUpdatedDocument = expect.objectContaining({
                projectTitle: MOCK_UPDATE_REQUEST.projectTitle,
                status: 'complete',
                updatedAt: MOCK_TIMESTAMP,
                tocData: expect.objectContaining({
                    bigPictureGoal: MOCK_EXISTING_PROJECT.tocData.bigPictureGoal, // Unchanged value preserved
                    projectAim: 'New Aim', // New value from request
                    objectives: 'Updated Objectives', // New value from request
                    beneficiaries: MOCK_EXISTING_PROJECT.tocData.beneficiaries, // Unchanged value preserved
                }),
                tocColor: expectedTocColor,
            });

            expect(ProjectService.getProjectById).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_PROJECT_ID);
            expect(ProjectService.checkProjectTitleExists).toHaveBeenCalled(); // Title change confirmed
            expect(mockCollection.replaceOne).toHaveBeenCalledWith(
                { userId: MOCK_USER_ID, projectId: MOCK_PROJECT_ID },
                expectedUpdatedDocument
            );
            expect(updatedProject.tocData.projectAim).toBe('New Aim');
            expect(updatedProject.tocColor.projectAim.shape).toBe('#0000FF');
        });

        it('should throw an error if the project ID is not found', async () => {
            ProjectService.getProjectById = jest.fn().mockResolvedValue(null);

            await expect(ProjectService.updateProject(MOCK_UPDATE_REQUEST)).rejects.toThrow(
                `Project ${MOCK_PROJECT_ID} not found for user ${MOCK_USER_ID}`
            );
        });

        it('should throw error if name changes but updateName is false', async () => {
            const request = { ...MOCK_UPDATE_REQUEST, updateName: false };
            ProjectService.getProjectById = jest.fn().mockResolvedValue(MOCK_EXISTING_PROJECT); // Title is different

            await expect(ProjectService.updateProject(request)).rejects.toThrow(
                'Project name change detected. Set updateName: true to confirm.'
            );
            expect(ProjectService.checkProjectTitleExists).not.toHaveBeenCalled();
        });

        it('should skip uniqueness check if project title is NOT changed', async () => {
            const request = { ...MOCK_UPDATE_REQUEST, projectTitle: 'Old Title', updateName: false }; // Match existing title
            ProjectService.getProjectById = jest.fn().mockResolvedValue(MOCK_EXISTING_PROJECT);

            await ProjectService.updateProject(request);

            // Title check should be skipped
            expect(ProjectService.checkProjectTitleExists).not.toHaveBeenCalled();
            // Name confirmation is ignored because title hasn't changed
        });
    });

    describe('deleteProject', () => {
        it('should return true when project is successfully deleted', async () => {
            mockCollection.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const deleted = await ProjectService.deleteProject(MOCK_USER_ID, MOCK_PROJECT_ID);

            expect(deleted).toBe(true);
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({
                userId: MOCK_USER_ID,
                projectId: MOCK_PROJECT_ID
            });
        });

        it('should return false when project is not found for deletion', async () => {
            mockCollection.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 0 });

            const deleted = await ProjectService.deleteProject(MOCK_USER_ID, '999');

            expect(deleted).toBe(false);
        });
    });

    describe('getProjects', () => {
        it('should call listUserProjects and return an array if no projectId is provided', async () => {
            const MOCK_PROJECT_LIST = [MOCK_DB_PROJECT];
            ProjectService.listUserProjects = jest.fn().mockResolvedValue(MOCK_PROJECT_LIST);

            const result = await ProjectService.getProjects({ userId: MOCK_USER_ID });

            expect(ProjectService.listUserProjects).toHaveBeenCalledWith(MOCK_USER_ID);
            expect(result).toEqual(MOCK_PROJECT_LIST); // listUserProjects already maps to ProjectData
        });

        it('should call getProjectById and return a single project if projectId is provided', async () => {
            ProjectService.getProjectById = jest.fn().mockResolvedValue(MOCK_PROJECT_DATA);

            const result = await ProjectService.getProjects({ userId: MOCK_USER_ID, projectId: MOCK_PROJECT_ID });

            expect(ProjectService.getProjectById).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_PROJECT_ID);
            expect(result).toEqual(MOCK_PROJECT_DATA);
        });

        it('should throw an error if projectId is provided but project is not found', async () => {
            ProjectService.getProjectById = jest.fn().mockResolvedValue(null);

            await expect(ProjectService.getProjects({ userId: MOCK_USER_ID, projectId: '999' })).rejects.toThrow(
                `Project 999 not found for user ${MOCK_USER_ID}`
            );
        });
    });

    describe('closeConnection', () => {
        it('should call client.close and reset static properties if client exists', async () => {
            // Simulate that the connection was established
            mockClient.connect.mockResolvedValue();
            await ProjectService.getDatabase();

            await ProjectService.closeConnection();

            expect(mockClient.close).toHaveBeenCalledTimes(1);
            // Verify static state reset
            expect(ProjectService.client).toBeNull();
            expect(ProjectService.db).toBeNull();
        });

        it('should do nothing if client is already null', async () => {
            await ProjectService.closeConnection();

            expect(mockClient.close).not.toHaveBeenCalled();
        });
    });
});
