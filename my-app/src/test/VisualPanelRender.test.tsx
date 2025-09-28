import React from "react";
import { render, screen } from "@testing-library/react";
import VisualPanel from "../components/VisualPanel";

// minimal local type (so we don't need to import from pages/App)
type Data = {
  activities?: string;
  objectives?: string;
  aim?: string;
  goal?: string;
  externalInfluences?: string;
};

test("renders all columns and shows initial values", () => {
  const data: Data = {
    activities: "A1",
    objectives: "O1",
    aim: "Aim text",
    goal: "G1",
    externalInfluences: "Cloud value",
  };

  render(<VisualPanel data={data as any} />);

  // Column titles
  expect(screen.getByText(/activities/i)).toBeInTheDocument();
  expect(screen.getByText(/objectives/i)).toBeInTheDocument();
  expect(screen.getByText(/aim/i)).toBeInTheDocument();
  expect(screen.getByText(/goal/i)).toBeInTheDocument();

  // Textareas display the initial values (use getByDisplayValue for inputs/textarea)
  expect(screen.getByDisplayValue("A1")).toBeInTheDocument();
  expect(screen.getByDisplayValue("O1")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Aim text")).toBeInTheDocument();
  expect(screen.getByDisplayValue("G1")).toBeInTheDocument();

  // Influence cloud shows value
  expect(screen.getByText(/cloud value/i)).toBeInTheDocument();

  // There should be arrows between columns (three arrows for four columns)
  expect(screen.getAllByText("→").length).toBe(3);
});
