import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VisualPanel from "../components/VisualPanel";

describe("VisualPanel", () => {
  const mockData = {
    activities: "A1",
    objectives: "O1",
    aim: "Aim text",
    goal: "G1",
    externalInfluences: "Cloud value",
  };

  test("renders all column titles and initial values", () => {
    render(<VisualPanel data={mockData as any} />);

    // Column titles (exact match to avoid 'Aim' vs 'Aim text' collision)
    expect(screen.getByText("Activities")).toBeInTheDocument();
    expect(screen.getByText("Objectives")).toBeInTheDocument();
    expect(screen.getByText("Aim")).toBeInTheDocument();
    expect(screen.getByText("Goal")).toBeInTheDocument();

    // Initial values in textareas
    expect(screen.getByDisplayValue("A1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("O1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Aim text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("G1")).toBeInTheDocument();

    // Influence cloud value
    expect(screen.getByText("Cloud value")).toBeInTheDocument();

    // Flow arrows (3 arrows for 4 columns)
    expect(screen.getAllByText("→").length).toBe(3);
  });

  test("toggles customization panel", () => {
    render(<VisualPanel data={mockData as any} />);

    const customizeBtn = screen.getByRole("button", { name: /customize/i });
    expect(screen.queryByText(/cloud color/i)).not.toBeInTheDocument();

    fireEvent.click(customizeBtn);
    expect(screen.getByText(/cloud color/i)).toBeInTheDocument();

    fireEvent.click(customizeBtn);
    expect(screen.queryByText(/cloud color/i)).not.toBeInTheDocument();
  });

  test("adds and removes extra cards", () => {
    render(<VisualPanel data={mockData as any} />);

    // Add a new card to the first column
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // New card appears
    expect(screen.getByDisplayValue("New Card")).toBeInTheDocument();

    // Enable customization to show the remove buttons
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    // Remove the new card (main card has no '-' button)
    const removeBtn = screen.getByRole("button", { name: "-" });
    fireEvent.click(removeBtn);

    expect(screen.queryByDisplayValue("New Card")).not.toBeInTheDocument();
  });

  test("changes cloud color", () => {
    render(<VisualPanel data={mockData as any} />);

    // Open customization panel
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    // There is no <label> for this input; select it directly by class & type
    const colorInput = document.querySelector(
      ".cloud-customize input[type='color']"
    ) as HTMLInputElement;

    expect(colorInput).not.toBeNull();

    // Change the color
    fireEvent.change(colorInput, { target: { value: "#FF0000" } });
    expect(colorInput.value.toLowerCase()).toBe("#ff0000");
  });

  test("edits a card's text", () => {
    render(<VisualPanel data={mockData as any} />);

    const textarea = screen.getByDisplayValue("A1");
    fireEvent.change(textarea, { target: { value: "Updated Activity" } });

    expect(screen.getByDisplayValue("Updated Activity")).toBeInTheDocument();
  });
});
