import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import FormPanel from "../components/FormPanel";
import VisualPanel from "../components/VisualPanel";
import "../style/App.css";
import { updateToc, fetchTocProjectById } from "../services/api";
import Joyride, { Step, CallBackProps } from "react-joyride";

export type Data = {
  projectTitle: string;
  goal: string;
  aim: string;
  beneficiaries: string;
  activities: string;
  objectives: string;
  externalInfluences: string;
};

function App() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<Data>({
    projectTitle: "",
    goal: "",
    aim: "",
    beneficiaries: "",
    activities: "",
    objectives: "",
    externalInfluences: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [runTour, setRunTour] = useState(true);

  const userId = localStorage.getItem("userId") || "1234";
  const currentProjectId = projectId || localStorage.getItem("projectId") || "1";

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await fetchTocProjectById(userId, currentProjectId);
        if (res.success && res.data?.projects?.length > 0) {
          const toc = res.data.projects[0].tocData;
          setData({
            projectTitle: toc.projectTitle || "",
            goal: toc.bigPictureGoal || "",
            aim: toc.projectAim || "",
            beneficiaries: toc.beneficiaries?.description || "",
            activities: (toc.activities || []).join(", "),
            objectives: (toc.objectives || []).join(", "),
            externalInfluences: (toc.externalFactors || []).join(", "),
          });
        }
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };
    loadProject();
  }, [userId, currentProjectId]);

  const updateField = (field: keyof Data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        userId,
        projectId: currentProjectId,
        projectTitle: data.projectTitle,
        updateName: false,
        status: "draft" as "draft" | "published",
        tocData: {
          bigPictureGoal: data.goal || "",
          projectAim: data.aim || "",
          objectives: data.objectives
            ? data.objectives.split(",").map((s) => s.trim())
            : [],
          beneficiaries: { description: data.beneficiaries || "", estimatedReach: 0 },
          activities: data.activities
            ? data.activities.split(",").map((s) => s.trim())
            : [],
          outcomes: [],
          externalFactors: data.externalInfluences
            ? data.externalInfluences.split(",").map((s) => s.trim())
            : [],
          evidenceLinks: [],
        },
      };
      const result = await updateToc(payload);
      if (result.success) alert("Form saved successfully!");
      else alert("Error saving form: " + result.message);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Unexpected error. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  // Joyride steps
  const steps: Step[] = [
    { target: ".progress-container", content: "Completion progress bar." },
    { target: "#field-goal", content: "Define your long-term Goal." },
    { target: "#field-aim", content: "Define your project Aim." },
    { target: "#field-beneficiaries", content: "Specify the beneficiaries." },
    { target: "#field-activities", content: "List project activities." },
    { target: "#field-objectives", content: "Define project objectives." },
    { target: "#field-externalInfluences", content: "Mention external influences." },
    { target: ".btn.customize", content: "Customize the visual map." },
    { target: ".btn.export", content: "Export the visual map." },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
   
  };

  return (
    <div>
      {/* Header */}
      <div className="app-header">
  <h1>Theory of Change Visualization</h1>
</div>

      {/* Joyride */}
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        scrollToFirstStep
        disableScrolling={false}
        spotlightClicks
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{ options: { zIndex: 10000 } }}
      />

      {/* Main Container */}
      <div className="app-container">
        <FormPanel data={data} updateField={updateField} />
        <div className="right-panel-wrapper">
          <VisualPanel data={data} />
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="spinner"></span> Saving...
              </>
            ) : (
              <>Save</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
