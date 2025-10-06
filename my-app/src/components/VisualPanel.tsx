import React, { useState, useEffect, useRef } from "react";
import { Data } from "../pages/App";
import { exportVisualDiagram } from "../utils/exportUtils";
import "../style/Visual.css";

type VisualProps = {
  data: Data;
  updateField: (field: keyof Data, value: string) => void;
  columnColors?: { [field in keyof Data]?: { bg: string; text: string } };
  cloudColors?: { bg: string; text: string }[];
  updateColumnColors?: (colors: { [field in keyof Data]?: { bg: string; text: string } }) => void;
  updateCloudColors?: (colors: { bg: string; text: string }[]) => void;
};

type CardConfig = {
  value: string;
};

type ColumnConfig = {
  title: string;
  field: keyof Data;
  cards: CardConfig[];
};

export default function VisualPanel({ 
  data, 
  updateField, 
  columnColors = {
    activities: { bg: "#8C6BDC", text: "#fff" },
    objectives: { bg: "#A07CFD", text: "#fff" },
    aim: { bg: "#C074E0", text: "#fff" },
    goal: { bg: "#8C6BDC", text: "#fff" },
  }, 
  cloudColors = [{ bg: "#cbe3ff", text: "#333" }], 
  updateColumnColors = () => {}, 
  updateCloudColors = () => {} 
}: VisualProps) {
  console.log("=== VisualPanel render ===");
  console.log("Received cloudColors prop:", cloudColors);
  console.log("cloudColors length:", cloudColors?.length);
  console.log("cloudColors[0]:", cloudColors?.[0]);
  
  const [showCustomize, setShowCustomize] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Initialize columns with 1 card each from data
  const initialColumns: ColumnConfig[] = [
    { title: "Activities", field: "activities", cards: [{ value: data.activities || "" }] },
    { title: "Objectives", field: "objectives", cards: [{ value: data.objectives || "" }] },
    { title: "Aim", field: "aim", cards: [{ value: data.aim || "" }] },
    { title: "Goal", field: "goal", cards: [{ value: data.goal || "" }] },
  ];

  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);

  // Local state for colors (fallback if not provided from parent)
  const [localColumnColors, setLocalColumnColors] = useState<{ [field in keyof Data]?: { bg: string; text: string } }>({
    activities: { bg: "#8C6BDC", text: "#fff" },
    objectives: { bg: "#A07CFD", text: "#fff" },
    aim: { bg: "#C074E0", text: "#fff" },
    goal: { bg: "#8C6BDC", text: "#fff" },
  });

  const [clouds, setClouds] = useState<string[]>(data.externalInfluences ? JSON.parse(data.externalInfluences) : [""]);
  const [localCloudColors, setLocalCloudColors] = useState<{ bg: string; text: string }[]>(clouds.map(() => ({ bg: "#cbe3ff", text: "#333" })));

  // Update local cloud colors when prop changes
  useEffect(() => {
    console.log("=== CloudColors prop useEffect ===");
    console.log("New cloudColors prop:", cloudColors);
    console.log("cloudColors truthy?", !!cloudColors);
    console.log("cloudColors length > 0?", cloudColors && cloudColors.length > 0);
    if (cloudColors && cloudColors.length > 0) {
      console.log("Updating local cloud colors to match prop:", cloudColors);
      setLocalCloudColors([...cloudColors]); // Force new array reference
    } else {
      console.log("Not updating local colors - prop is empty or falsy");
    }
  }, [cloudColors]);

  // Use provided colors or local colors - but prefer provided colors
  const effectiveColumnColors = columnColors || localColumnColors;
  const effectiveCloudColors = (cloudColors && cloudColors.length > 0) 
    ? cloudColors 
    : localCloudColors;
  
  console.log("cloudColors prop:", cloudColors);
  console.log("localCloudColors:", localCloudColors);
  console.log("Effective cloud colors being used:", effectiveCloudColors);

  // Sync columns with FormPanel data
  useEffect(() => {
    setColumns((cols) =>
      cols.map((col) => {
        const values = (() => {
          if (!data[col.field]) return [""];
          try {
            const parsed = JSON.parse(data[col.field]);
            return Array.isArray(parsed) ? parsed : [data[col.field]];
          } catch {
            return [data[col.field]];
          }
        })();

        return { ...col, cards: values.map((v) => ({ value: v })) };
      })
    );

    if (data.externalInfluences) {
      try {
        const parsedClouds: string[] = JSON.parse(data.externalInfluences);
        setClouds(parsedClouds);
        if (!cloudColors) {
          setLocalCloudColors(parsedClouds.map((_, idx) => localCloudColors[idx] || { bg: "#cbe3ff", text: "#333" }));
        }
      } catch {
        setClouds([data.externalInfluences]);
      }
    }
  }, [data]);

  // --- Column Handlers ---
  const handleAddCard = (colIndex: number) => {
    const newColumns = [...columns];
    if (newColumns[colIndex].cards.length >= 3) {
      alert("Maximum 3 cards per column.");
      return;
    }
    newColumns[colIndex].cards.push({ value: "" });
    setColumns(newColumns);
    updateField(newColumns[colIndex].field, JSON.stringify(newColumns[colIndex].cards.map(c => c.value)));
  };

  const handleRemoveCard = (colIndex: number, cardIndex: number) => {
    const newColumns = [...columns];
    if (newColumns[colIndex].cards.length <= 1) return;
    newColumns[colIndex].cards.splice(cardIndex, 1);
    setColumns(newColumns);
    updateField(newColumns[colIndex].field, JSON.stringify(newColumns[colIndex].cards.map(c => c.value)));
  };

  const handleCardTextChange = (colIndex: number, cardIndex: number, value: string) => {
    const newColumns = [...columns];
    newColumns[colIndex].cards[cardIndex].value = value;
    setColumns(newColumns);
    updateField(newColumns[colIndex].field, JSON.stringify(newColumns[colIndex].cards.map(c => c.value)));
  };

  const handleColumnColorChange = (field: keyof Data, type: "bg" | "text", value: string) => {
    if (updateColumnColors) {
      // If parent manages colors, update parent
      const newColors = {
        ...effectiveColumnColors,
        [field]: { ...effectiveColumnColors[field], [type]: value }
      };
      updateColumnColors(newColors);
    } else {
      // If local colors, update local state
      setLocalColumnColors(prev => ({
        ...prev,
        [field]: { ...prev[field], [type]: value }
      }));
    }
  };

  // --- External Influences (Clouds) ---
  // Sync clouds and cloud colors with data
  useEffect(() => {
    console.log("=== VisualPanel useEffect triggered ===");
    console.log("data.externalInfluences:", data.externalInfluences);
    console.log("Current cloudColors prop:", cloudColors);
    console.log("Current effectiveCloudColors:", effectiveCloudColors);
    
    if (!data.externalInfluences) {
      setClouds([""]);
      if (!cloudColors) {
        console.log("Setting local cloud colors to default");
        setLocalCloudColors([{ bg: "#cbe3ff", text: "#333" }]);
      } else if (updateCloudColors) {
        console.log("Updating parent cloud colors to default");
        updateCloudColors([{ bg: "#cbe3ff", text: "#333" }]);
      }
      return;
    }
    
    try {
      const influenceArray: string[] = JSON.parse(data.externalInfluences);
      console.log("Parsed influences:", influenceArray);
      setClouds(influenceArray);
      
      // DON'T OVERRIDE COLORS IF THEY'RE PROVIDED FROM PARENT
      if (cloudColors && cloudColors.length > 0) {
        console.log("Using colors from parent, not overriding");
        return; // Don't override colors from parent
      }
      
      // Only manage colors locally if parent doesn't provide them
      const requiredColorCount = influenceArray.length;
      const currentColors = effectiveCloudColors;
      
      if (currentColors.length !== requiredColorCount) {
        const newColors = Array(requiredColorCount).fill(null).map((_, idx) => 
          currentColors[idx] || { bg: "#cbe3ff", text: "#333" }
        );
        
        if (updateCloudColors) {
          console.log("Updating parent with synchronized colors");
          updateCloudColors(newColors);
        } else {
          console.log("Setting local synchronized colors");
          setLocalCloudColors(newColors);
        }
      }
    } catch {
      setClouds([data.externalInfluences]);
      if (!cloudColors && updateCloudColors) {
        updateCloudColors([{ bg: "#cbe3ff", text: "#333" }]);
      }
    }
    console.log("=== End VisualPanel useEffect ===");
  }, [data.externalInfluences]);

  const handleAddCloud = (index: number) => {
    if (clouds.length >= 3) {
      alert("Maximum 3 external influences.");
      return;
    }
    const newClouds = [...clouds];
    newClouds.splice(index + 1, 0, "");
    setClouds(newClouds);

    if (updateCloudColors) {
      const newColors = [...effectiveCloudColors];
      newColors.splice(index + 1, 0, { bg: "#cbe3ff", text: "#333" });
      updateCloudColors(newColors);
    } else {
      const newColors = [...localCloudColors];
      newColors.splice(index + 1, 0, { bg: "#cbe3ff", text: "#333" });
      setLocalCloudColors(newColors);
    }

    updateField("externalInfluences", JSON.stringify(newClouds));
  };

  const handleRemoveCloud = (index: number) => {
    if (clouds.length <= 1) return;
    const newClouds = clouds.filter((_, i) => i !== index);
    setClouds(newClouds);
    
    if (updateCloudColors) {
      const newColors = effectiveCloudColors.filter((_, i) => i !== index);
      updateCloudColors(newColors);
    } else {
      const newColors = localCloudColors.filter((_, i) => i !== index);
      setLocalCloudColors(newColors);
    }
    
    updateField("externalInfluences", JSON.stringify(newClouds));
  };

  const handleCloudChange = (index: number, value: string) => {
    const newClouds = [...clouds];
    newClouds[index] = value;
    setClouds(newClouds);
    updateField("externalInfluences", JSON.stringify(newClouds));
  };

  const handleCloudColorChange = (type: "bg" | "text", value: string) => {
    console.log(`=== CLOUD COLOR CHANGE ===`);
    console.log(`Changing cloud color ${type} to:`, value);
    console.log("Current effective cloud colors:", effectiveCloudColors);
    
    if (updateCloudColors) {
      const newColors = effectiveCloudColors.map(c => ({ ...c, [type]: value }));
      console.log("Updating parent cloud colors to:", newColors);
      updateCloudColors(newColors);
    } else {
      console.log("Updating local cloud colors");
      setLocalCloudColors(prev => {
        const newColors = prev.map(c => ({ ...c, [type]: value }));
        console.log("New local colors:", newColors);
        return newColors;
      });
    }
    console.log(`=== END CLOUD COLOR CHANGE ===`);
  };

  const handleExport = async () => {
    if (exportRef.current) {
      try {
        await exportVisualDiagram(exportRef.current, data.projectTitle || 'Theory-of-Change');
      } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
      }
    }
  };

  return (
    <div className="right-panel-container">
      <div className="panel-buttons">
        <button className="btn customize" onClick={() => setShowCustomize(!showCustomize)}>
          {showCustomize ? "Hide Customization" : "Customize"}
        </button>
        <button className="btn export" onClick={handleExport}>
          Export
        </button>
      </div>
<div ref={exportRef} className="export-content">
      {/* External Influences */}
      <div className="influence-cloud-wrapper">
        <div className="influence-title">External Influences</div>
        <div className="influence-cloud-row">
          {clouds.map((value, idx) => (
            <div key={idx} className="influence-cloud-wrapper-item">
              <div
                className="influence-cloud"
                style={{
                  backgroundColor: effectiveCloudColors[idx]?.bg || "#cbe3ff",
                  color: effectiveCloudColors[idx]?.text || "#333",
                }}
              >
                <div className="cloud-value">
                  <input
                    type="text"
                    value={value}
                    disabled={!showCustomize}
                    onChange={(e) => handleCloudChange(idx, e.target.value)}
                  />
                </div>
              </div>
              

              {/* Only show add/remove buttons for this cloud if customization is on */}
              {showCustomize && (
                <div className="cloud-buttons">
                  {/* Add button can appear on every cloud if you want */}
                  {clouds.length < 3 && (
                    <button className="add-cloud-btn" onClick={() => handleAddCloud(idx)}>+</button>
                  )}

                  {/* Remove button only on the last cloud */}
                  {clouds.length > 1 && idx === clouds.length - 1 && (
                    <button className="remove-cloud-btn" onClick={() => handleRemoveCloud(idx)}>−</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show one color picker for ALL clouds */}
        {showCustomize && (
          <div className="cloud-customize-controls">
            <span>Cloud</span>
            <input
              type="color"
              className="cloud-color-picker"
              value={effectiveCloudColors[0]?.bg || "#cbe3ff"}
              onChange={(e) => handleCloudColorChange("bg", e.target.value)}
            />
            <span>Text:</span>
            <input
              type="color"
              className="cloud-color-picker"
              value={effectiveCloudColors[0]?.text || "#333"}
              onChange={(e) => handleCloudColorChange("text", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="right-panel">
        {columns.map((col, colIndex) => (
          <React.Fragment key={col.title}>
            <div className="outer-card">
              {/* Column-wide color picker */}
              {showCustomize && (
                <div className="customize-controls-column">
                  <label className="color-picker-wrapper">
                    Card:{" "}
                    <input
                      type="color"
                      className="color-picker-circle"
                      value={effectiveColumnColors[col.field]?.bg || "#8C6BDC"}
                      onChange={(e) => handleColumnColorChange(col.field, "bg", e.target.value)}
                    />
                  </label>
                  <label className="color-picker-wrapper">
                    Text:{" "}
                    <input
                      type="color"
                      className="color-picker-circle"
                      value={effectiveColumnColors[col.field]?.text || "#fff"}
                      onChange={(e) => handleColumnColorChange(col.field, "text", e.target.value)}
                    />
                  </label>
                </div>
              )}

              {col.cards.map((card, idx) => (
                <div className="card-container" key={idx}>
                  <div
                    className="flow-card"
                    style={{
                      backgroundColor: effectiveColumnColors[col.field]?.bg || "#8C6BDC",
                      color: effectiveColumnColors[col.field]?.text || "#fff",
                    }}
                  >
                    <div className="card-title">{idx === 0 ? col.title : ""}</div>
                    <div className="card-value">
                      <input
                        type="text"
                        value={card.value}
                        disabled={!showCustomize}
                        onChange={(e) => handleCardTextChange(colIndex, idx, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add/remove buttons */}
              <div className="add-remove-wrapper">
                {showCustomize && (
                  <>
                    <button
                      className="add-card-btn"
                      onClick={() => handleAddCard(colIndex)}
                    >
                      +
                    </button>
                    {col.cards.length > 1 && (
                      <button
                        className="remove-card-btn"
                        onClick={() => handleRemoveCard(colIndex, col.cards.length - 1)}
                      >
                        −
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {colIndex < columns.length - 1 && <span className="flow-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
    </div>
  );
}