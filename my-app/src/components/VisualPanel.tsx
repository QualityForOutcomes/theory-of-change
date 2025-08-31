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
  <div className="right-panel-container">
    {/* Buttons at the top */}
    <div className="panel-buttons">
      <button className="btn customize">Customize</button>
      <button className="btn export">Export</button>
    </div>

    {/* Cards + arrows */}
    <div className="right-panel">
      {columns.map((col, index) => (
        <React.Fragment key={col.title}>
          <div className="flow-card" style={{ backgroundColor: col.color }}>
            <div className="card-title">{col.title}</div>
            <div className="card-value">{col.value || "..."}</div>
          </div>
          {index < columns.length - 1 && <span className="flow-arrow">→</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);


}

