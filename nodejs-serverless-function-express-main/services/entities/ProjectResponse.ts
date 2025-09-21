export interface ProjectResponse {
    userId: string;
    projectId: string;
    projectTitle: string;
    tocData?: any;
    bigPictureGoal?: string;
    projectAim?: string;
    objectives?: any[];
    beneficiaries?: any;
    activities?: any[];
    outcomes?: any[];
    externalFactors?: any[];
    evidenceLinks?: any[];
    status: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}