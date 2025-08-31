import React, { useState, useRef } from "react";
import FormPanel from "../components/FormPanel";
import VisualPanel from "../components/VisualPanel";
import "../style/App.css";
import Joyride, { CallBackProps, Step } from "react-joyride";

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

  const [runTour, setRunTour] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const updateField = (field: keyof Data, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExport = (type: "PDF" | "PNG") => {
    console.log(`Exporting as ${type}`);
    setExportOpen(false);
  };

  const handleCustomize = () => {
    console.log("Opening Customize options...");
  };

  // Joyride steps
  const steps: Step[] = [
    {
      target: ".progress-container",
      content: "This is the progress bar showing completion % of the form.",
    },
    {
      target: "#field-goal",
      content: "Start by defining your long-term Goal here.",
    },
    {
      target: "#field-aim",
      content: "Now write the immediate Aim of your project.",
    },
    {
      target: "#field-beneficiaries",
      content: "Specify who will benefit from this project.",
    },
    {
      target: "#customize-btn",
      content: "You can customize your visual map here.",
    },
    {
      target: "#export-btn",
      content: "Export your visual as PDF or PNG using this button.",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    // optional: you can handle step changes here
    // e.g., console.log(data);
  };

  return (
    <div className="app-container">
      <Joyride
  steps={steps}
  run={runTour}
  continuous
  scrollToFirstStep
  disableScrolling={false}   
  spotlightClicks={true}     
  scrollOffset={100}         
  showSkipButton
  showProgress
  callback={handleJoyrideCallback}
  styles={{
    options: {
      zIndex: 10000,
    },
  }}
/>


      {/* Left Side = Form */}
      <FormPanel data={data} updateField={updateField} />

      {/* Right Side = Visual */}
      <div className="right-panel-wrapper">

        <VisualPanel data={data} />
      </div>
    </div>
  );
}

export default App;
