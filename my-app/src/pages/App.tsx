import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import FormPanel from "../components/FormPanel";
import VisualPanel from "../components/VisualPanel";
import "../style/App.css";
import { updateToc, fetchTocProjectById, fetchUserTocs } from "../services/api";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";

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

const Toast = ({ message, type = "success", onClose }: { message: string; type?: "success" | "error" | "warning"; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L2 17h16L10 2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <div className={`toast-notification toast-${type}`}>
      {icons[type]}
      {message}
    </div>
  );
};

function App() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const userId = localStorage.getItem("userId");
  const currentProjectId = projectId || localStorage.getItem("projectId");
  
  const defaultColumnColors = {
    activities: { bg: "#8C6BDC", text: "#ffffff" },
    objectives: { bg: "#A07CFD", text: "#ffffff" },
    aim: { bg: "#C074E0", text: "#ffffff" },
    goal: { bg: "#8C6BDC", text: "#ffffff" },
  };

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
  }>(defaultColumnColors);

  const [cloudColors, setCloudColors] = useState<{ bg: string; text: string }[]>([
    { bg: "#cbe3ff", text: "#333333" },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const normalizeHex = (hex: string) => {
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
  };

  // Helper function to check if a field has content
  const hasContent = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.some(item => item && item.trim() !== '');
      }
      return value.trim() !== '';
    } catch {
      return value.trim() !== '';
    }
  };

  // Check if all required fields are filled
  const isFormValid = (): boolean => {
    return (
      data.projectTitle.trim() !== '' &&
      hasContent(data.goal) &&
      hasContent(data.aim) &&
      hasContent(data.beneficiaries) &&
      hasContent(data.activities) &&
      hasContent(data.objectives) &&
      hasContent(data.externalInfluences)
    );
  };

  // Get list of empty fields for error message
  const getEmptyFields = (): string[] => {
    const emptyFields: string[] = [];
    const fieldNames: Record<string, string> = {
      projectTitle: 'Project Title',
      goal: 'Goal',
      aim: 'Aim',
      beneficiaries: 'Beneficiaries',
      activities: 'Activities',
      objectives: 'Objectives',
      externalInfluences: 'External Influences'
    };

    if (data.projectTitle.trim() === '') emptyFields.push(fieldNames.projectTitle);
    if (!hasContent(data.goal)) emptyFields.push(fieldNames.goal);
    if (!hasContent(data.aim)) emptyFields.push(fieldNames.aim);
    if (!hasContent(data.beneficiaries)) emptyFields.push(fieldNames.beneficiaries);
    if (!hasContent(data.activities)) emptyFields.push(fieldNames.activities);
    if (!hasContent(data.objectives)) emptyFields.push(fieldNames.objectives);
    if (!hasContent(data.externalInfluences)) emptyFields.push(fieldNames.externalInfluences);

    return emptyFields;
  };

  useEffect(() => {
    const currentProjectId = projectId || localStorage.getItem("projectId");
    const hasSeenTour = localStorage.getItem("tour-seen-project-1");
    
    if (currentProjectId === "1" && !hasSeenTour) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, [projectId]);

  useEffect(() => {
    const loadProject = async () => {
      const projectIdFromParams = projectId || localStorage.getItem("projectId");
      
      if (!projectIdFromParams) {
        setColumnColors(defaultColumnColors);
        setCloudColors([{ bg: "#cbe3ff", text: "#333333" }]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetchTocProjectById(projectIdFromParams);
        if (res.success && res.data?.projects?.length > 0) {
          const project = res.data.projects[0];
          const toc = project.tocData;
          const colors = project.tocColor || {};

          let externalInfluencesString = "";
          if (toc.externalFactors && Array.isArray(toc.externalFactors)) {
            externalInfluencesString = JSON.stringify(toc.externalFactors);
          }

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

          const newColumnColors = {
            activities: (colors.activities?.bg) 
              ? colors.activities 
              : defaultColumnColors.activities,
            objectives: (colors.objectives?.bg) 
              ? colors.objectives 
              : defaultColumnColors.objectives,
            aim: (colors.projectAim?.bg) 
              ? colors.projectAim 
              : defaultColumnColors.aim,
            goal: (colors.bigPictureGoal?.bg) 
              ? colors.bigPictureGoal 
              : defaultColumnColors.goal,
          };
          setColumnColors(newColumnColors);

          if (colors.externalFactors) {
            if (Array.isArray(colors.externalFactors)) {
              setCloudColors([...colors.externalFactors]);
            } else if (typeof colors.externalFactors === 'object') {
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
          } else {
            setCloudColors([{ bg: "#cbe3ff", text: "#333333" }]);
          }
        } else {
          setColumnColors({ ...defaultColumnColors });
          setCloudColors([{ bg: "#cbe3ff", text: "#333333" }]);
        }
      } catch (err) {
        console.error("Failed to load project", err);
        setToast({ message: "Failed to load project", type: "error" });
        setColumnColors({ ...defaultColumnColors });
        setCloudColors([{ bg: "#cbe3ff", text: "#333333" }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const updateField = (field: keyof Data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateColumnColors = (colors: { [field in keyof Data]?: { bg: string; text: string } }) => {
    setColumnColors(colors);
  };

  const updateCloudColors = (colors: { bg: string; text: string }[]) => {
    setCloudColors(colors);
  };

  const handleFieldAdded = (fieldName: string) => {
    setHighlightField(fieldName);
    setTimeout(() => setHighlightField(null), 2100);
  };

  const handleSave = async () => {
    // Validate form before saving
    if (!isFormValid()) {
      const emptyFields = getEmptyFields();
      const fieldList = emptyFields.length <= 3 
        ? emptyFields.join(', ')
        : `${emptyFields.slice(0, 2).join(', ')}, and ${emptyFields.length - 2} more`;
      
      setToast({ 
        message: `Please fill in all required fields: ${fieldList}`, 
        type: "warning" 
      });
      return;
    }

    setIsSaving(true);
    try {
      const parseArrayField = (value: string): string[] => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return value.split(",").map(s => s.trim()).filter(s => s);
        }
      };

      const externalFactorsArray = parseArrayField(data.externalInfluences);

      const normalizedCloudColors = externalFactorsArray.map((_, index) => 
        cloudColors[index] || { bg: "#cbe3ff", text: "#333333" }
      );

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

      const result = await updateToc(payload);
      if (result.success) {
        setToast({ message: "Form saved successfully!", type: "success" });
      } else {
        setToast({ message: `Error saving form: ${result.message}`, type: "error" });
        console.error("Save error:", result);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setToast({ message: err.response?.data?.message || "Unexpected error occurred", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const steps: Step[] = [
    { target: ".progress-container", content: "Track your completion progress here." },
    { target: "#step-goal", content: "Step 1: Define your long-term Goal." },
    { target: "#step-aim", content: "Step 2: Define your project Aim." },
    { target: "#step-beneficiaries", content: "Step 3: Specify the beneficiaries." },
    { target: "#step-activities", content: "Step 4: List project activities." },
    { target: "#step-objectives", content: "Step 5: Define project objectives." },
    { target: "#step-externalInfluences", content: "Step 6: Mention external influences." },
    { target: ".btn.customise", content: "Step 7: Customise your visual map colors." },
    { target: ".btn.export", content: "Step 8: Export your diagram." },
    { target: ".btn-save", content: "Step 9: Save your work." },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("tour-seen-project-1", "true");
      setRunTour(false);
    }
  };

  const canSave = isFormValid();

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="app-header">
        <h1>Theory of Change Visualisation</h1>
      </div>

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

      <div className="app-container">
        <FormPanel 
          data={data} 
          updateField={updateField}
          highlightField={highlightField}
        />
        <div className="right-panel-wrapper">
          <VisualPanel 
            data={data} 
            updateField={updateField}
            columnColors={columnColors}
            cloudColors={cloudColors}
            updateColumnColors={updateColumnColors}
            updateCloudColors={updateCloudColors}
            onFieldAdded={handleFieldAdded}
            isLoading={isLoading}
          />
          <button 
            className="btn-save" 
            onClick={handleSave} 
            disabled={isSaving || !canSave}
            title={!canSave ? "Please fill in all required fields" : ""}
          >
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