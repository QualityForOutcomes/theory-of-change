export default interface CreateProjectRequest {
    userId: string;
    projectTitle: string;
    bigPictureGoal?: string;
    projectAim?: string;
    objectives?: any[];
    beneficiaries?: any;
    activities?: any[];
    outcomes?: any[];
    externalFactors?: any[];
    evidenceLinks?: any[];
    status?: string;
    tocColor?: any;
}