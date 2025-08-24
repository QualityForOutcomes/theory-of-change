import React, { useState } from "react";
import FormPanel from "../components/FormPanel";
import VisualPanel from "../components/VisualPanel";
import "../style/App.css";

export type Data = {
  goal: string;
  aim: string;
  beneficiaries: string;
  activities: string;
  objectives: string;
  externalInfluences: string; 
};

function App() {
  const [data, setData] = useState<Data>({
    goal: "",
    aim: "",
    beneficiaries: "",
    activities: "",
    objectives: "",
    externalInfluences: "",
  });

  const [exportOpen, setExportOpen] = useState(false);

  const updateField = (field: keyof Data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExport = (type: "PDF" | "PNG") => {
    console.log(`Exporting as ${type}`);
    // TODO: implement export functionality
    setExportOpen(false);
  };

  const handleCustomize = () => {
    console.log("Opening Customize options...");
    // TODO: Add customization logic
  };

  return (
    <div className="app-container">
      <FormPanel data={data} updateField={updateField} />

      {/* Right panel wrapper with export button */}
     <div className="right-panel-wrapper">
        <div className="panel-header">
          <div className="panel-buttons">
            <button className="btn customize" onClick={handleCustomize}>
              Customize
            </button>
            <div className="export-wrapper">
              <button
                className="btn export"
                onClick={() => setExportOpen(!exportOpen)}
              >
                Export ▼
              </button>
              {exportOpen && (
                <div className="export-options">
                  <div onClick={() => handleExport("PDF")}>PDF</div>
                  <div onClick={() => handleExport("PNG")}>PNG</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VisualPanel content */}
        <VisualPanel data={data} />
      </div>
    </div>
  );
}

export default App;
