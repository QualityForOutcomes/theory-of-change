import React, { useState, useEffect } from "react";
import { Data } from "../pages/App";

type FormProps = {
  data: Data;
  updateField: (field: keyof Data, value: string) => void;
};

export default function FormPanel({ data, updateField }: FormProps) {
  const fields: (keyof Data)[] = [
    "goal",
    "aim",
    "beneficiaries",
    "activities",
    "objectives",
    "externalInfluences",
  ];

  const [errors, setErrors] = useState<Record<keyof Data, string>>({
    goal: "",
    aim: "",
    beneficiaries: "",
    activities: "",
    objectives: "",
    externalInfluences: "",
  });

  // Progress bar calculation
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const filledFields = fields.filter((f) => data[f].trim() !== "").length;
    setProgress((filledFields / fields.length) * 100);
  }, [data]);

  // Validation check
  const validateField = (field: keyof Data, value: string) => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: `${field} is required` }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="left-panel">
      <h1>Theory of Change Form</h1>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="progress-text">{Math.round(progress)}% completed</p>

      {fields.map((field) => (
        <div className="form-group" key={field}>
          <label>
            {field === "externalInfluences"
              ? "External Influences"
              : field.charAt(0).toUpperCase() + field.slice(1)}
          </label>

          {field === "beneficiaries" ? (
            <input
              value={data[field]}
              onChange={(e) => {
                updateField(field, e.target.value);
                validateField(field, e.target.value);
              }}
              placeholder={`Enter ${field}...`}
              className={errors[field] ? "error-input" : ""}
            />
          ) : (
            <textarea
              value={data[field]}
              onChange={(e) => {
                updateField(field, e.target.value);
                validateField(field, e.target.value);
              }}
              placeholder={`Enter ${field}...`}
              className={errors[field] ? "error-input" : ""}
            />
          )}

          {errors[field] && <span className="error-text">{errors[field]}</span>}
        </div>
      ))}
    </div>
  );
}
