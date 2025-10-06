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
export type ColumnColors = {
  [field in keyof Data]?: { bg: string; text: string };
};

export type CloudColor = { bg: string; text: string };

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

  const [columnColors, setColumnColors] = useState<{
    [field in keyof Data]?: { bg: string; text: string }
  }>({
    activities: { bg: "#8C6BDC", text: "#ffffff" },
    objectives: { bg: "#A07CFD", text: "#ffffff" },
    aim: { bg: "#C074E0", text: "#ffffff" },
    goal: { bg: "#8C6BDC", text: "#ffffff" },
  });

  const [cloudColors, setCloudColors] = useState<{ bg: string; text: string }[]>([
    { bg: "#cbe3ff", text: "#333333" },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [runTour, setRunTour] = useState(true);

  const userId = localStorage.getItem("userId");
  const currentProjectId = projectId || localStorage.getItem("projectId");

  const normalizeHex = (hex: string) => {
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
  };

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      const projectIdFromParams = projectId || localStorage.getItem("projectId");
      if (!projectIdFromParams) return;

      try {
        const res = await fetchTocProjectById(projectIdFromParams);
        if (res.success && res.data?.projects?.length > 0) {
          const project = res.data.projects[0];
          const toc = project.tocData;
          const colors = project.tocColor || {};

          // Parse external influences properly
          let externalInfluencesString = "";
          if (toc.externalFactors && Array.isArray(toc.externalFactors)) {
            externalInfluencesString = JSON.stringify(toc.externalFactors);
          }

          // Parse activities and objectives properly
          let activitiesString = "";
          if (toc.activities && Array.isArray(toc.activities)) {
            activitiesString = JSON.stringify(toc.activities);
          }

          let objectivesString = "";
          if (toc.objectives && Array.isArray(toc.objectives)) {
            objectivesString = JSON.stringify(toc.objectives);
          }

          setData({
            projectTitle: toc.projectTitle || "",
            goal: toc.bigPictureGoal || "",
            aim: toc.projectAim || "",
            beneficiaries: toc.beneficiaries?.description || "",
            activities: activitiesString,
            objectives: objectivesString,
            externalInfluences: externalInfluencesString,
          });

          // Map backend color structure to frontend structure
          setColumnColors({
            activities: colors.activities || { bg: "#8C6BDC", text: "#ffffff" },
            objectives: colors.objectives || { bg: "#A07CFD", text: "#ffffff" },
            aim: colors.projectAim || { bg: "#C074E0", text: "#ffffff" },
            goal: colors.bigPictureGoal || { bg: "#8C6BDC", text: "#ffffff" },
          });

          // Handle cloud colors
          // Handle cloud colors - convert object to array if needed
   if (colors.externalFactors) {
     if (Array.isArray(colors.externalFactors)) {
       setCloudColors(colors.externalFactors);
     } else if (typeof colors.externalFactors === 'object') {
       // Backend returned object format, convert to array
       const cloudArray = [];
       for (let i = 0; i < 10; i++) {
         if (colors.externalFactors[i.toString()]) {
           cloudArray.push(colors.externalFactors[i.toString()]);
         } else {
           break;
         }
       }
       setCloudColors(cloudArray.length > 0 ? cloudArray : [{ bg: "#cbe3ff", text: "#333333" }]);
     }
   }
        }
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };

    loadProject();
  }, [projectId]);

  const updateField = (field: keyof Data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Add functions to update colors from VisualPanel
  const updateColumnColors = (colors: { [field in keyof Data]?: { bg: string; text: string } }) => {
    setColumnColors(colors);
  };

  const updateCloudColors = (colors: { bg: string; text: string }[]) => {
    console.log("=== App.tsx updateCloudColors called ===");
    console.log("New colors received:", colors);
    setCloudColors(colors);
    console.log("=== End updateCloudColors ===");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse arrays from JSON strings
      const parseArrayField = (value: string): string[] => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return value.split(",").map(s => s.trim()).filter(s => s);
        }
      };

      console.log("=== DEBUGGING CLOUD COLORS ===");
      console.log("Raw data.externalInfluences:", data.externalInfluences);
      console.log("Current columnColors:", columnColors);
      console.log("Current cloudColors:", cloudColors);
      console.log("CloudColors length:", cloudColors.length);
      
      const externalFactorsArray = parseArrayField(data.externalInfluences);
      console.log("Parsed external factors array:", externalFactorsArray);
      console.log("Number of external factors:", externalFactorsArray.length);

      // Ensure we have the right number of cloud colors
      const normalizedCloudColors = externalFactorsArray.map((_, index) => 
        cloudColors[index] || { bg: "#cbe3ff", text: "#333333" }
      );

      console.log("Normalized cloud colors:", normalizedCloudColors);
      console.log("Will send externalFactors colors:", normalizedCloudColors.map(c => ({
        bg: normalizeHex(c.bg),
        text: normalizeHex(c.text),
      })));
      console.log("=== END DEBUG ===");

      // Create the color payload that matches backend expectations
      const tocColorPayload = {
        bigPictureGoal: {
          bg: normalizeHex(columnColors.goal?.bg || "#8C6BDC"),
          text: normalizeHex(columnColors.goal?.text || "#ffffff"),
        },
        projectAim: {
          bg: normalizeHex(columnColors.aim?.bg || "#C074E0"),
          text: normalizeHex(columnColors.aim?.text || "#ffffff"),
        },
        objectives: {
          bg: normalizeHex(columnColors.objectives?.bg || "#A07CFD"),
          text: normalizeHex(columnColors.objectives?.text || "#ffffff"),
        },
        activities: {
          bg: normalizeHex(columnColors.activities?.bg || "#8C6BDC"),
          text: normalizeHex(columnColors.activities?.text || "#ffffff"),
        },
        externalFactors: normalizedCloudColors.map(c => ({
          bg: normalizeHex(c.bg),
          text: normalizeHex(c.text),
        })),
      };

      const payload = {
        userId,
        projectId: currentProjectId,
        projectTitle: data.projectTitle,
        updateName: false,
        status: "draft" as "draft" | "published",
        tocData: {
          bigPictureGoal: data.goal || "",
          projectAim: data.aim || "",
          objectives: parseArrayField(data.objectives),
          beneficiaries: { 
            description: data.beneficiaries || "", 
            estimatedReach: 0 
          },
          activities: parseArrayField(data.activities),
          outcomes: [],
          externalFactors: parseArrayField(data.externalInfluences),
          evidenceLinks: [],
        },
        tocColor: tocColorPayload,
      };

      console.log("Saving payload:", JSON.stringify(payload, null, 2));

      const result = await updateToc(payload);
      if (result.success) {
        alert("Form saved successfully!");
        console.log("Save result:", result);
        console.log("=== BACKEND RESPONSE ===");
        console.log("Backend returned tocColor:", result.data?.tocColor);
        console.log("Backend externalFactors colors:", result.data?.tocColor?.externalFactors);
        console.log("=== END BACKEND RESPONSE ===");
      } else {
        alert("Error saving form: " + result.message);
        console.error("Save error:", result);
      }
    } catch (err: any) {
      console.error("Save error:", err);
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
    // Handle joyride callback
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
          <VisualPanel 
            data={data} 
            updateField={updateField}
            columnColors={columnColors}
            cloudColors={cloudColors}
            updateColumnColors={updateColumnColors}
            updateCloudColors={updateCloudColors}
          />
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