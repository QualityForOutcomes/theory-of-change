import React, { useState } from "react";
import { Data } from "../pages/App";
import "../style/Visual.css"

type VisualProps = {
  data: Data;
};

type CardConfig = {
  value: string;
  bgColor: string;
  textColor: string;
};

type ColumnConfig = {
  title: string;
  cards: CardConfig[];
};

export default function VisualPanel({ data }: VisualProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>([
    {
      title: "Activities",
      cards: [
        { value: data.activities || "...", bgColor: "#8C6BDC", textColor: "#fff" }
      ]
    },
    {
      title: "Objectives",
      cards: [
        { value: data.objectives || "...", bgColor: "#A07CFD", textColor: "#fff" }
      ]
    },
    {
      title: "Aim",
      cards: [
        { value: data.aim || "...", bgColor: "#C074E0", textColor: "#fff" }
      ]
    },
    {
      title: "Goal",
      cards: [
        { value: data.goal || "...", bgColor: "#8C6BDC", textColor: "#fff" }
      ]
    }
  ]);

  const [influenceColor, setInfluenceColor] = useState("#A3C2FF");
  const [showCustomize, setShowCustomize] = useState(false);

  const handleAddCard = (colIndex: number) => {
    const newColumns = [...columns];
    newColumns[colIndex].cards.push({
      value: "New Card",
      bgColor: "#C074E0",
      textColor: "#fff"
    });
    setColumns(newColumns);
  };

  const handleRemoveCard = (colIndex: number, cardIndex: number) => {
    const newColumns = [...columns];
    if (cardIndex === 0) return; // Do not remove main card
    newColumns[colIndex].cards.splice(cardIndex, 1);
    setColumns(newColumns);
  };

  const handleCardColorChange = (
    colIndex: number,
    cardIndex: number,
    field: "bgColor" | "textColor",
    value: string
  ) => {
    const newColumns = [...columns];
    newColumns[colIndex].cards[cardIndex][field] = value;
    setColumns(newColumns);
  };

  const handleCardTextChange = (
    colIndex: number,
    cardIndex: number,
    value: string
  ) => {
    const newColumns = [...columns];
    newColumns[colIndex].cards[cardIndex].value = value;
    setColumns(newColumns);
  };

  return (
    <div className="right-panel-container">
      {/* Buttons */}
      <div className="panel-buttons">
        <button
          className="btn customize"
          onClick={() => setShowCustomize(!showCustomize)}
        >
          {showCustomize ? "Hide Customization" : "Customize"}
        </button>
        <button className="btn export">Export</button>
      </div>

      {/* Influence Cloud */}
      <div
        className="influence-cloud"
        style={{ ["--cloud-color" as any]: influenceColor }}
      >
        <div className="cloud-value">{data.externalInfluences || "..."}</div>
      </div>

      {/* Cloud customization */}
      {showCustomize && (
        <div className="cloud-customize">
          <span className="label">Cloud Color</span>
          <input
            type="color"
            value={influenceColor}
            onChange={(e) => setInfluenceColor(e.target.value)}
            className="color-picker"
          />
        </div>
      )}

      {/* Cards Flow */}
      <div className="right-panel">
        {columns.map((col, colIndex) => (
          <React.Fragment key={col.title}>
            <div className="outer-card">
              {col.cards.map((card, cardIndex) => (
                <div key={cardIndex} className="card-container">
                  <div
                    className="flow-card"
                    style={{ backgroundColor: card.bgColor, color: card.textColor }}
                  >
                    <div className="card-title">
                      {cardIndex === 0 ? col.title : ""}
                    </div>
                    <textarea
                      className="card-value-input"
                      value={card.value}
                      onChange={(e) =>
                        handleCardTextChange(colIndex, cardIndex, e.target.value)
                      }
                    />
                  </div>

                  {showCustomize && (
                    <div className="customize-controls">
                      <div>
                        <span>Card</span>
                        <input
                          type="color"
                          value={card.bgColor}
                          onChange={(e) =>
                            handleCardColorChange(
                              colIndex,
                              cardIndex,
                              "bgColor",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <span>Text</span>
                        <input
                          type="color"
                          value={card.textColor}
                          onChange={(e) =>
                            handleCardColorChange(
                              colIndex,
                              cardIndex,
                              "textColor",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      {/* Remove button for extra cards */}
                      {cardIndex > 0 && (
                        <button
                          className="remove-card-btn"
                          onClick={() => handleRemoveCard(colIndex, cardIndex)}
                        >
                          -
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add Card Button */}
              <button
                onClick={() => handleAddCard(colIndex)}
                className="add-card-btn"
              >
                +
              </button>
            </div>

            {/* Arrow */}
            {colIndex < columns.length - 1 && (
              <span className="flow-arrow">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}