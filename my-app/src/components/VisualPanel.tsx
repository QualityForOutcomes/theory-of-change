import React, { useState } from "react";
import { Data } from "../pages/App";

type VisualProps = {
  data: Data;
};

type Template = {
  name: string;
  columns: { title: string; color: string }[];
  influenceColor: string;
};

type TemplatePreviewProps = {
  template: Template;
};

// Small preview component for template colors
function TemplatePreview({ template }: TemplatePreviewProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "4px",
      }}
    >
      {/* Influence cloud preview */}
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: template.influenceColor,
          border: "1px solid #ccc",
        }}
      ></div>

      {/* Column color previews */}
      {template.columns.map((col, i) => (
        <div
          key={i}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "4px",
            backgroundColor: col.color,
            border: "1px solid #ccc",
          }}
        />
      ))}

      {/* Template name */}
      <span style={{ marginLeft: "8px" }}>{template.name}</span>
    </div>
  );
}

export default function VisualPanel({ data }: VisualProps) {
  // Define templates
  const templates: Template[] = [
    {
      name: "Purple Haze",
      influenceColor: "#A3C2FF",
      columns: [
        { title: "Activities", color: "#8C6BDC" },
        { title: "Objectives", color: "#A07CFD" },
        { title: "Aim", color: "#C074E0" },
        { title: "Goal", color: "#8C6BDC" },
      ],
    },
    {
      name: "Sunset Glow",
      influenceColor: "#FFAB66",
      columns: [
        { title: "Goal", color: "#FF8F5C" },
        { title: "Aim", color: "#FFA877" },
        { title: "Objectives", color: "#FFCC66" },
        { title: "Activities", color: "#FFAB66" },
      ],
    },
    {
      name: "Ocean Breeze",
      influenceColor: "#26A69A",
      columns: [
        { title: "Activities", color: "#4DB6AC" },
        { title: "Objectives", color: "#26A69A" },
        { title: "Aim", color: "#00897B" },
        { title: "Goal", color: "#00695C" },
      ],
    },
    {
      name: "Fiery Dawn",
      influenceColor: "#FF8F00",
      columns: [
        { title: "Activities", color: "#FF7043" },
        { title: "Objectives", color: "#F4511E" },
        { title: "Aim", color: "#FFB300" },
        { title: "Goal", color: "#FFA000" },
      ],
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    templates[0]
  );
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowTemplateOptions(false);
  };

  return (
    <div className="right-panel-container">
      {/* Buttons */}
      <div className="panel-buttons">
        <div style={{ position: "relative" }}>
          <button
            className="btn customize"
            onClick={() => setShowTemplateOptions(!showTemplateOptions)}
          >
            Customize
          </button>
          {showTemplateOptions && (
            <div className="export-options">
              {templates.map((t) => (
                <div key={t.name} onClick={() => handleTemplateSelect(t)}>
                  <TemplatePreview template={t} />
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn export">Export</button>
      </div>

      {/* Influence Cloud */}
      <div
        className="influence-cloud"
        style={{ ["--cloud-color" as any]: selectedTemplate.influenceColor }}
      >
        <div className="cloud-value">{data.externalInfluences || "..."}</div>
      </div>

      {/* Cards */}
      <div className="right-panel">
        {selectedTemplate.columns.map((col, index) => {
          // Map title to the correct data value
          const valueMap: Record<string, string> = {
            Activities: data.activities,
            Objectives: data.objectives,
            Aim: data.aim,
            Goal: data.goal,
          };
          return (
            <React.Fragment key={col.title}>
              <div
                className="flow-card"
                style={{ backgroundColor: col.color }}
              >
                <div className="card-title">{col.title}</div>
                <div className="card-value">{valueMap[col.title] || "..."}</div>
              </div>
              {index < selectedTemplate.columns.length - 1 && (
                <span className="flow-arrow">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
