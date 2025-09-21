export interface BulkProjectData {
    projectId?: string;
    projectTitle: string;
    projectData: {
        bigPictureGoal?: string;
        projectAim?: string;
        objectives?: any[];
        beneficiaries?: any;
        activities?: any[];
        outcomes?: any[];
        externalFactors?: any[];
        evidenceLinks?: any[];
        status?: string;
    };
}