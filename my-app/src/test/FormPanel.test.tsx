import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FormPanel from "../components/FormPanel";

// Fake Data factory
const makeData = (overrides: Partial<any> = {}) => ({
  projectTitle: "Test Project",
  goal: "",
  aim: "",
  beneficiaries: "",
  activities: "",
  objectives: "",
  externalInfluences: "",
  ...overrides,
});

describe("FormPanel - 200 Character Validation", () => {
  test("shows warning when approaching character limit (180+ chars)", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const goalTextarea = screen.getByPlaceholderText(/enter goal/i);
    
    // Create a string with exactly 180 characters
    const text180 = "a".repeat(180);
    fireEvent.change(goalTextarea, { target: { value: text180 } });
    
    expect(screen.getByText(/Approaching character limit \(180\/200\)/i)).toBeInTheDocument();
  });

  test("shows warning with correct count for 190 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const aimTextarea = screen.getByPlaceholderText(/enter aim/i);
    const text190 = "b".repeat(190);
    
    fireEvent.change(aimTextarea, { target: { value: text190 } });
    
    expect(screen.getByText(/Approaching character limit \(190\/200\)/i)).toBeInTheDocument();
  });

  test("shows warning at exactly 200 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const activitiesTextarea = screen.getByPlaceholderText(/enter activities/i);
    const text200 = "c".repeat(200);
    
    fireEvent.change(activitiesTextarea, { target: { value: text200 } });
    
    expect(screen.getByText(/Approaching character limit \(200\/200\)/i)).toBeInTheDocument();
  });

  test("does NOT show warning for text below 180 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const objectivesTextarea = screen.getByPlaceholderText(/enter objectives/i);
    const text179 = "d".repeat(179);
    
    fireEvent.change(objectivesTextarea, { target: { value: text179 } });
    
    expect(screen.queryByText(/Approaching character limit/i)).toBeNull();
  });

  test("shows error message when exceeding 200 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const goalTextarea = screen.getByPlaceholderText(/enter goal/i);
    const text201 = "e".repeat(201);
    
    fireEvent.change(goalTextarea, { target: { value: text201 } });
    
    expect(screen.getByText(/Maximum 200 characters allowed/i)).toBeInTheDocument();
  });

  test("adds error-input class when exceeding character limit", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const externalInfluencesTextarea = screen.getByPlaceholderText(/enter externalInfluences/i);
    const text250 = "f".repeat(250);
    
    fireEvent.change(externalInfluencesTextarea, { target: { value: text250 } });
    
    expect(externalInfluencesTextarea).toHaveClass("error-input");
  });

  test("clears error when reducing text from over 200 to under 200 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const aimTextarea = screen.getByPlaceholderText(/enter aim/i);
    
    // First exceed limit
    const text250 = "g".repeat(250);
    fireEvent.change(aimTextarea, { target: { value: text250 } });
    expect(screen.getByText(/Maximum 200 characters allowed/i)).toBeInTheDocument();
    
    // Then reduce to valid length
    const text150 = "g".repeat(150);
    fireEvent.change(aimTextarea, { target: { value: text150 } });
    expect(screen.queryByText(/Maximum 200 characters allowed/i)).toBeNull();
  });

  test("validates beneficiaries input field with character limit", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const beneficiariesInput = screen.getByPlaceholderText(/enter beneficiaries/i);
    const text201 = "h".repeat(201);
    
    fireEvent.change(beneficiariesInput, { target: { value: text201 } });
    
    expect(screen.getByText(/Maximum 200 characters allowed/i)).toBeInTheDocument();
    expect(beneficiariesInput).toHaveClass("error-input");
  });

  test("warning disappears when text is reduced below 180 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const activitiesTextarea = screen.getByPlaceholderText(/enter activities/i);
    
    // Show warning
    const text185 = "i".repeat(185);
    fireEvent.change(activitiesTextarea, { target: { value: text185 } });
    expect(screen.getByText(/Approaching character limit \(185\/200\)/i)).toBeInTheDocument();
    
    // Warning should disappear
    const text175 = "i".repeat(175);
    fireEvent.change(activitiesTextarea, { target: { value: text175 } });
    expect(screen.queryByText(/Approaching character limit/i)).toBeNull();
  });

  test("maxLength attribute prevents typing beyond 200 characters", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const goalTextarea = screen.getByPlaceholderText(/enter goal/i) as HTMLTextAreaElement;
    
    expect(goalTextarea.maxLength).toBe(200);
  });

  test("handles boundary case at exactly 179 characters (no warning)", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const objectivesTextarea = screen.getByPlaceholderText(/enter objectives/i);
    const text179 = "j".repeat(179);
    
    fireEvent.change(objectivesTextarea, { target: { value: text179 } });
    
    expect(screen.queryByText(/Approaching character limit/i)).toBeNull();
    expect(screen.queryByText(/Maximum 200 characters allowed/i)).toBeNull();
  });
});

describe("FormPanel - Additional Coverage", () => {
  test("calculates progress correctly based on filled fields", () => {
    let data = makeData({ 
      goal: JSON.stringify(["Some goal"]),
      aim: JSON.stringify(["Some aim"]) 
    });
    const updateField = jest.fn();

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    // 2 out of 6 fields filled = 33.33%
    expect(screen.getByText(/33% completed/i)).toBeInTheDocument();

    // Add more fields
    data = { ...data, beneficiaries: JSON.stringify(["Some beneficiaries"]) };
    rerender(<FormPanel data={data} updateField={updateField} />);
    
    // 3 out of 6 = 50%
    expect(screen.getByText(/50% completed/i)).toBeInTheDocument();
  });

  test("handles JSON array format for multiple values", () => {
    let data = makeData({ 
      activities: JSON.stringify(["Activity 1", "Activity 2"]) 
    });
    const updateField = jest.fn();

    render(<FormPanel data={data} updateField={updateField} />);
    
    const inputs = screen.getAllByPlaceholderText(/enter activities/i);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("Activity 1");
    expect(inputs[1]).toHaveValue("Activity 2");
  });

  test("handles legacy delimiter format (|||)", () => {
    let data = makeData({ 
      objectives: "Objective 1|||Objective 2" 
    });
    const updateField = jest.fn();

    render(<FormPanel data={data} updateField={updateField} />);
    
    const textareas = screen.getAllByPlaceholderText(/enter objectives/i);
    expect(textareas).toHaveLength(2);
    expect(textareas[0]).toHaveValue("Objective 1");
    expect(textareas[1]).toHaveValue("Objective 2");
  });

  test("sidebar toggles open and closed", () => {
  const data = makeData();
  const updateField = jest.fn();

  const { container } = render(
    <FormPanel data={data} updateField={updateField} />
  );

  const sidebar = container.querySelector(".sidebar") as HTMLElement;
  
  // Check the inline style object
  expect(sidebar.style.width).toBe("350px");

  const toggleBtn = screen.getByRole("button", { name: /←/i });
  fireEvent.click(toggleBtn);

  expect(sidebar.style.width).toBe("60px");
  expect(screen.getByRole("button", { name: /→/i })).toBeInTheDocument();
});

  test("renders correct field labels", () => {
    const data = makeData();
    const updateField = jest.fn();

    render(<FormPanel data={data} updateField={updateField} />);

    expect(screen.getByText("Step 1: Identify Big-Picture Goal")).toBeInTheDocument();
    expect(screen.getByText("Step 2: Define Project Aim")).toBeInTheDocument();
    expect(screen.getByText("Step 3: Define Project Beneficiaries")).toBeInTheDocument();
    expect(screen.getByText("Step 4: Define Project Activities")).toBeInTheDocument();
    expect(screen.getByText("Step 5: Define Project Objectives")).toBeInTheDocument();
    expect(screen.getByText("Step 6: External Influences")).toBeInTheDocument();
  });

  test("beneficiaries uses input instead of textarea", () => {
    const data = makeData();
    const updateField = jest.fn();

    render(<FormPanel data={data} updateField={updateField} />);

    const beneficiariesField = screen.getByPlaceholderText(/enter beneficiaries/i);
    expect(beneficiariesField.tagName).toBe("INPUT");

    const goalField = screen.getByPlaceholderText(/enter goal/i);
    expect(goalField.tagName).toBe("TEXTAREA");
  });
});