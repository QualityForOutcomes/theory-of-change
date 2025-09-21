export interface UpdateProjectRequest {
    userId: string;
    projectId: string;
    projectTitle: string;
    updateName?: boolean;
    tocData?: {
        bigPictureGoal?: string;
        projectAim?: string;
        objectives?: any[];
        beneficiaries?: any;
        activities?: any[];
        outcomes?: any[];
        externalFactors?: any[];
        evidenceLinks?: any[];
    };
    status?: string;
}