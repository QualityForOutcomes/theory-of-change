import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VisualPanel from "../components/VisualPanel";

jest.mock('../utils/exportUtils');

const makeData = (overrides: Partial<any> = {}) => ({
  projectTitle: "Test Project",
  goal: JSON.stringify(["Test Goal"]),
  aim: JSON.stringify(["Test Aim"]),
  beneficiaries: "",
  activities: JSON.stringify(["Test Activity"]),
  objectives: JSON.stringify(["Test Objective"]),
  externalInfluences: JSON.stringify(["External Factor"]),
  ...overrides,
});

describe("VisualPanel - Basic Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("toggles customize mode on button click", () => {
    const data = makeData();
    const updateField = jest.fn();

    render(<VisualPanel data={data} updateField={updateField} />);

    const customizeBtn = screen.getByRole("button", { name: /customize/i });
    
    expect(customizeBtn).toHaveTextContent("Customize");
    
    fireEvent.click(customizeBtn);
    expect(customizeBtn).toHaveTextContent("Hide Customization");
    
    expect(screen.getAllByLabelText(/card:/i).length).toBeGreaterThan(0);
  });

  test("inputs are disabled when not in customize mode", () => {
    const data = makeData();

    render(<VisualPanel data={data} updateField={jest.fn()} />);

    const goalInput = screen.getByDisplayValue("Test Goal");
    expect(goalInput).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /customize/i }));

    expect(goalInput).not.toBeDisabled();
  });

  test("renders correct number of flow arrows between columns", () => {
    const data = makeData();

    const { container } = render(
      <VisualPanel data={data} updateField={jest.fn()} />
    );

    const arrows = container.querySelectorAll(".flow-arrow");
    expect(arrows).toHaveLength(3);
  });
});