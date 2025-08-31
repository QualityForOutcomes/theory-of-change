import React, { useState, useEffect } from "react";
import { Data } from "../pages/App";

type FormProps = {
  data: Data;
  updateField: (field: keyof Data, value: string) => void;
};

export default function FormPanel({ data, updateField }: FormProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const fields: (keyof Data)[] = [
    "goal",
    "aim",
    "beneficiaries",
    "activities",
    "objectives",
    "externalInfluences",
  ];

  const fieldLabels: Record<keyof Data, string> = {
    goal: "Step 1: Identify Big-Picture Goal",
    aim: "Step 2: Define Project Aim",
    beneficiaries: "Step 3: Define Project Beneficiaries",
    activities: "Step 4: Define Project Activities",
    objectives: "Step 5: Define Project Objectives",
    externalInfluences: "Step 6: External Influences",
  };

  const fieldExamples: Record<keyof Data, string> = {
    goal: "e.g., Reduce poverty in rural areas within 5 years",
    aim: "e.g., Improve access to clean water for villages",
    beneficiaries: "e.g., Rural households, farmers, local schools",
    activities: "e.g., Build wells, train locals, provide water filters",
    objectives: "e.g., 80% households with safe drinking water in 2 years",
    externalInfluences: "e.g., Government policies, climate conditions",
  };

  const [errors, setErrors] = useState<Record<keyof Data, string>>({
    goal: "",
    aim: "",
    beneficiaries: "",
    activities: "",
    objectives: "",
    externalInfluences: "",
  });

  const maxChars = 200;

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const filledFields = fields.filter((f) => data[f].trim() !== "").length;
    setProgress((filledFields / fields.length) * 100);
  }, [data]);

  const validateField = (field: keyof Data, value: string) => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: `${field} is required` }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="sidebar-container">
  <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
    {/* Sidebar content */}
    <div className="sidebar-content">
      <h1>Theory of Change Form</h1>

      {/* Progress Bar */}
      <div className="progress-container" id="progress-bar">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="progress-text">{Math.round(progress)}% completed</p>

      {fields.map((field) => (
        <div className="form-group" key={field} id={`step-${field}`}>
          <label htmlFor={`field-${field}`} className="form-label">
            {fieldLabels[field]}
          </label>

          <p className="helper-text">{fieldExamples[field]}</p>

          {field === "beneficiaries" ? (
            <input
              id={`field-${field}`}
              value={data[field]}
              maxLength={maxChars}
              onChange={(e) => {
                updateField(field, e.target.value);
                validateField(field, e.target.value);
              }}
              placeholder={`Enter ${field}...`}
              className={errors[field] ? "error-input" : ""}
            />
          ) : (
            <textarea
              id={`field-${field}`}
              value={data[field]}
              maxLength={maxChars}
              onChange={(e) => {
                updateField(field, e.target.value);
                validateField(field, e.target.value);
              }}
              placeholder={`Enter ${field}...`}
              className={errors[field] ? "error-input" : ""}
            />
          )}

          {errors[field] && (
            <span className="error-text">{errors[field]}</span>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* Toggle button outside sidebar */}
  <button className="toggle-btn" onClick={toggleSidebar}>
    {isOpen ? "←" : "→"}
  </button>
</div>

  );
}
