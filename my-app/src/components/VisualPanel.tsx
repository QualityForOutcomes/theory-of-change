import React from "react";
import { Data } from "../pages/App";

type VisualProps = {
  data: Data;
};

export default function VisualPanel({ data }: VisualProps) {
  const columns = [
    { title: "Activities", value: data.activities, color: "#BFA0FF" },
    { title: "Objectives", value: data.objectives, color: "#CBB7FF" },
    { title: "Aim", value: data.aim, color: "#E7B1F3" },
    { title: "Goal", value: data.goal, color: "#BFA0FF" },
  ];

  return (
    <div className="right-panel">
      {columns.map((col) => (
        <div className="column" key={col.title}>
          <div className="column-title">{col.title}</div>
          <div className="column-card" style={{ backgroundColor: col.color }}>
            {col.value || "..."}
          </div>
        </div>
      ))}
    </div>
  );
}

