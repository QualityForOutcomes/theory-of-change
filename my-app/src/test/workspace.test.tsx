import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Dummy Workspace component to mirror your UI
function Workspace() {
  const [showForm, setShowForm] = React.useState(false);
  return (
    <div>
      <h1>Workspace</h1>
      {!showForm ? (
        <button onClick={() => setShowForm(true)}>Create Project +</button>
      ) : (
        <form aria-label="create-project-form">
          <input placeholder="Project name" defaultValue="" />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

describe("Workspace", () => {
  test("renders heading and lets user open/close create form", () => {
    render(<Workspace />);

    // initial UI
    expect(
      screen.getByRole("heading", { name: /workspace/i })
    ).toBeInTheDocument();
    const createBtn = screen.getByRole("button", {
      name: /create project \+/i,
    });
    expect(createBtn).toBeInTheDocument();

    // open form
    fireEvent.click(createBtn);
    const form = screen.getByRole("form", { name: /create-project-form/i });
    expect(form).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

    // close form
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByRole("form", { name: /create-project-form/i })
    ).toBeNull();
  });
});
