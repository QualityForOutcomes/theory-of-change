import React, { useState, useEffect, useRef } from "react";
import { Data } from "../pages/App";

type FormProps = {
  data: Data;
  updateField: (field: keyof Data, value: string) => void;
  highlightField?: string | null; // NEW: Field to highlight
};

type FormField = Exclude<keyof Data, "projectTitle">;

export default function FormPanel({ data, updateField, highlightField }: FormProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const toggleSidebar = () => setIsOpen(!isOpen);

  const fields: FormField[] = [
    "goal",
    "aim",
    "beneficiaries",
    "activities",
    "objectives",
    "externalInfluences",
  ];

  const fieldLabels: Record<FormField, string> = {
    goal: "Step 1: Identify Big-Picture Goal",
    aim: "Step 2: Define Project Aim",
    beneficiaries: "Step 3: Define Project Beneficiaries",
    activities: "Step 4: Define Project Activities",
    objectives: "Step 5: Define Project Objectives",
    externalInfluences: "Step 6: External Influences",
  };

  const fieldExamples: Record<FormField, string> = {
    goal: "e.g., Reduce poverty in rural areas within 5 years",
    aim: "e.g., Improve access to clean water for villages",
    beneficiaries: "e.g., Rural households, farmers, local schools",
    activities: "e.g., Build wells, train locals, provide water filters",
    objectives: "e.g., 80% households with safe drinking water in 2 years",
    externalInfluences: "e.g., Government policies, climate conditions",
  };

  const [errors, setErrors] = useState<Record<FormField, string>>({
    goal: "",
    aim: "",
    beneficiaries: "",
    activities: "",
    objectives: "",
    externalInfluences: "",
  });

  const maxChars = 200;
  const warningThreshold = 180;

  const [progress, setProgress] = useState(0);
  
  // NEW: Handle highlighting when a field is added
  useEffect(() => {
    if (highlightField) {
      setActiveHighlight(highlightField);
      
      // Scroll to the field
      const fieldElement = fieldRefs.current[highlightField];
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Remove highlight after animation completes
      const timer = setTimeout(() => {
        setActiveHighlight(null);
      }, 2000); // 2 seconds (matches 2 animation cycles)
      
      return () => clearTimeout(timer);
    }
  }, [highlightField]);
  
  useEffect(() => {
    const filledFields = fields.filter((f) => {
      const values: string[] = safeParseArray(data[f]);
      return values.some((v) => v.trim() !== "");
    }).length;
    setProgress((filledFields / fields.length) * 100);
  }, [data]);

  const validateField = (field: FormField, value: string) => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: `${field} is required` }));
    } else if (value.length > maxChars) {
      setErrors((prev) => ({ ...prev, [field]: `Maximum ${maxChars} characters allowed` }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const safeParseArray = (raw: string | undefined): string[] => {
    if (!raw) return [""];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split("|||");
    }
  };

  return (
    <div
      className={`sidebar ${isOpen ? "open" : "collapsed"}`}
      style={{ width: isOpen ? "350px" : "60px" }}
    >
      <button className="toggle-btn" onClick={toggleSidebar}>
        {isOpen ? "←" : "→"}
      </button>

      <div className="sidebar-content">
        <div className="form-header">
          <h1 className="main-title">Theory of Change Form</h1>
          <p className="project-title">{data.projectTitle || "Untitled Project"}</p>
        </div>

        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-text">{Math.round(progress)}% completed</p>

        {fields.map((field) => {
          const cards = safeParseArray(data[field]);

          return (
           <div
  className="form-group"
  key={field}
  id={`step-${field}`}
  ref={(el) => { fieldRefs.current[field] = el }}
>

              <label htmlFor={`field-${field}`} className="form-label">
                {fieldLabels[field]}
              </label>
              <p className="helper-text">{fieldExamples[field]}</p>

              {cards.map((cardValue, idx) => (
                <div key={idx} style={{ marginBottom: "8px" }}>
                  {field === "beneficiaries" ? (
                    <input
                      id={`field-${field}-${idx}`}
                      value={cardValue}
                      maxLength={maxChars}
                      onChange={(e) => {
                        const updatedCards = [...cards];
                        updatedCards[idx] = e.target.value;
                        updateField(field, JSON.stringify(updatedCards));
                        validateField(field, e.target.value);
                      }}
                      placeholder={`Enter ${field}...`}
                      className={`${errors[field] ? "error-input" : ""} ${
                        activeHighlight === field && idx === cards.length - 1 ? "newly-added" : ""
                      }`}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <textarea
                      id={`field-${field}-${idx}`}
                      value={cardValue}
                      maxLength={maxChars}
                      onChange={(e) => {
                        const updatedCards = [...cards];
                        updatedCards[idx] = e.target.value;
                        updateField(field, JSON.stringify(updatedCards));
                        validateField(field, e.target.value);
                      }}
                      placeholder={`Enter ${field}...`}
                      className={`${errors[field] ? "error-input" : ""} ${
                        activeHighlight === field && idx === cards.length - 1 ? "newly-added" : ""
                      }`}
                      style={{ width: "100%" }}
                    />
                  )}

                  {cardValue.length >= warningThreshold && cardValue.length <= maxChars && (
                    <span className="warning-text">
                      Approaching character limit ({cardValue.length}/{maxChars})
                    </span>
                  )}
                </div>
              ))}

              {errors[field] && <span className="error-text">{errors[field]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}