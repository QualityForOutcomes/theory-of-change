export default interface ProjectData {
  projectId: string;
  status: 'draft' | 'published';
  type: 'project' | 'toc';
  createdAt: string;
  updatedAt: string;
  tocData: {
    projectTitle: string;
    bigPictureGoal?: string;
    projectAim?: string;
    objectives?: any[];
    beneficiaries?: {
      description: string;
      estimatedReach: number;
    };
    activities?: any[];
    outcomes?: any[];
    externalFactors?: any[];
    evidenceLinks?: any[];
  };
  tocColor?: any;
}