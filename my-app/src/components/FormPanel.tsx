import React from "react";
import { Data } from "../pages/App";

type FormProps = {
  data: Data;
  updateField: (field: keyof Data, value: string) => void;
};

export default function FormPanel({ data, updateField }: FormProps) {
  return (
    <div className="left-panel">
      <h1>Theory of Change Form</h1>

      {(["goal", "aim", "beneficiaries", "activities", "objectives", "externalInfluences"] as (keyof Data)[]).map(
  (field) => (
    <div className="form-group" key={field}>
      <label>{field === "externalInfluences" ? "External Influences" : field.charAt(0).toUpperCase() + field.slice(1)}</label>
      {field === "beneficiaries" ? (
        <input
          value={data[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={`Enter ${field}...`}
        />
      ) : (
        <textarea
          value={data[field]}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={`Enter ${field}...`}
        />
      )}
    </div>
))}

    </div>
  );
}
