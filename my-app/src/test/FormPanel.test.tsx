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

describe("FormPanel", () => {
  test("updates goal field and shows/clears validation errors", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value }; // mimic parent state update
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const goalTextarea = screen.getByPlaceholderText(/enter goal/i);

    // step 1: valid → clears error
    fireEvent.change(goalTextarea, { target: { value: "Valid goal" } });
    expect(screen.queryByText(/goal is required/i)).toBeNull();

    // step 2: clear → error appears
    fireEvent.change(goalTextarea, { target: { value: "" } });
    expect(screen.getByText(/goal is required/i)).toBeInTheDocument();
  });

  test("adds error styling class when beneficiaries is cleared", () => {
    let data = makeData();
    const updateField = (field: keyof typeof data, value: string) => {
      data = { ...data, [field]: value };
      rerender(<FormPanel data={data} updateField={updateField} />);
    };

    const { rerender } = render(
      <FormPanel data={data} updateField={updateField} />
    );

    const beneficiariesInput =
      screen.getByPlaceholderText(/enter beneficiaries/i);

    // type valid → no error
    fireEvent.change(beneficiariesInput, { target: { value: "John" } });
    expect(beneficiariesInput).not.toHaveClass("error-input");

    // clear → error class now applies
    fireEvent.change(beneficiariesInput, { target: { value: "" } });
    expect(beneficiariesInput).toHaveClass("error-input");
  });
});
