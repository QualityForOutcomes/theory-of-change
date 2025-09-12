import { Data } from "../pages/App";

export const mapFormToTocPayload = (
  formData: Data,
  userId: string,
  projectId: string,
  projectTitle: string,
  updateName: boolean,
  status: "draft" | "published"
) => {
  return {
    userId,
    projectId,
    projectTitle,
    updateName,
    status,
    tocData: {
      bigPictureGoal: formData.goal,
      projectAim: formData.aim,
      objectives: formData.objectives
        ? formData.objectives.split(",").map((o) => o.trim())
        : [],
      beneficiaries: {
        description: formData.beneficiaries,
        estimatedReach: 0, 
      },
      activities: formData.activities
        ? formData.activities.split(",").map((a) => a.trim())
        : [],
      outcomes: [], 
      externalFactors: formData.externalInfluences
        ? formData.externalInfluences.split(",").map((f) => f.trim())
        : [],
      evidenceLinks: [], 
    },
  };
};
