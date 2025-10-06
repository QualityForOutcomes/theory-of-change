import { Data } from "../../src/pages/App";

export const mapFormToTocPayload = (
  formData: Data,
  userId: string,
  projectId: string,
  projectTitle: string,
  updateName: boolean,
  status: "draft" | "published",
  columnColors: { [key in keyof Data]?: { bg: string; text: string } },
  cloudColors: { bg: string; text: string }[]
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
    tocColor: {
      activities: columnColors.activities || { bg: "#8C6BDC", text: "#fff" },
      objectives: columnColors.objectives || { bg: "#A07CFD", text: "#fff" },
      aim: columnColors.aim || { bg: "#C074E0", text: "#fff" },
      goal: columnColors.goal || { bg: "#8C6BDC", text: "#fff" },
      beneficiaries: columnColors.beneficiaries || { bg: "#A07CFD", text: "#fff" },
      externalFactors: cloudColors[0] || { bg: "#cbe3ff", text: "#333" }, // single color for all clouds
    },
  };
};
