export default interface ProjectData {
  projectTitle: string;
  bigPictureGoal: string;
  projectAim: string;
  objectives: string[];
  beneficiaries: {
    description: string;
    estimatedReach: number;
  };
  activities: string[];
  outcomes: string[];
  externalFactors: string[];
  evidenceLinks: string[];
  status: 'draft' | 'published';
  type?: 'project' | 'toc';
}