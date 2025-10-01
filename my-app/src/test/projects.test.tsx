// src/test/Project.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- Hard mock react-router-dom (virtual: no real package needed) ----
const mockNavigate = jest.fn();

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

// ---- Mock API used by ProjectsPage ----
jest.mock("../services/api", () => ({
  __esModule: true,
  fetchUserTocs: jest.fn(),
  createTocProject: jest.fn(),
}));

import { fetchUserTocs, createTocProject } from "../services/api";
// SUT (your page)
import ProjectsPage from "../pages/Project";

describe("ProjectsPage", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // default localStorage userId (read in component)
    localStorage.setItem("userId", "u123");

    // default: loading user projects succeeds with two projects
    (fetchUserTocs as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        projects: [
          { projectId: "p1", projectName: "Alpha" },
          { projectId: "p2", projectName: "Beta" },
        ],
      },
    });

    // default: creating a project succeeds (override in individual tests)
    (createTocProject as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        projectId: "np1",
        tocData: { projectTitle: "New Project" },
      },
    });

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    localStorage.clear();
  });

  it("loads and renders the user's projects", async () => {
    render(<ProjectsPage />);

    // Heading
    expect(
      screen.getByRole("heading", { name: /workspace/i })
    ).toBeInTheDocument();

    // Wait for loaded projects
    expect(await screen.findByText(/alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/beta/i)).toBeInTheDocument();

    // Create button visible
    expect(
      screen.getByRole("button", { name: /create project \+/i })
    ).toBeInTheDocument();

    // ensure API called once
    expect(fetchUserTocs).toHaveBeenCalledTimes(1);
  });

  it("shows alert when loading projects fails (console.error silenced in test)", async () => {
    (fetchUserTocs as jest.Mock).mockRejectedValueOnce(
      new Error("Load failed")
    );

    // Silence console.error for this test to avoid noisy output
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Load failed");
    });

    // Optional: assert the log occurred (kept minimal)
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
  });

  it("opens the create form, validates empty title (no call), then creates and navigates", async () => {
    render(<ProjectsPage />);

    // Wait for existing projects to show
    await screen.findByText(/alpha/i);

    // Open form
    fireEvent.click(screen.getByRole("button", { name: /create project \+/i }));
    const input = screen.getByPlaceholderText(
      /project name/i
    ) as HTMLInputElement;
    const saveBtn = screen.getByRole("button", { name: /save/i });

    // Click save with empty title -> should NOT call createTocProject
    expect(input.value).toBe("");
    fireEvent.click(saveBtn);
    expect(createTocProject).not.toHaveBeenCalled();

    // Enter a title and save
    fireEvent.change(input, { target: { value: "New Project" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // API was called with expected payload
      expect(createTocProject).toHaveBeenCalledTimes(1);
      expect(createTocProject).toHaveBeenCalledWith({
        userId: "u123",
        projectTitle: "New Project",
        status: "draft",
      });

      // Navigates to new project's route
      expect(mockNavigate).toHaveBeenCalledWith("/projects/np1");

      // projectId saved to localStorage
      expect(localStorage.getItem("projectId")).toBe("np1");
    });

    // New project appears in list (prepended)
    expect(screen.getByText(/new project/i)).toBeInTheDocument();
  });

  it("alerts when createTocProject returns success=false with a message", async () => {
    (createTocProject as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: "Duplicate project title",
    });

    render(<ProjectsPage />);

    await screen.findByText(/alpha/i);

    fireEvent.click(screen.getByRole("button", { name: /create project \+/i }));
    fireEvent.change(screen.getByPlaceholderText(/project name/i), {
      target: { value: "Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Duplicate project title");
    });
    // No navigation
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("alerts when createTocProject throws (e.g., duplicate) via catch path", async () => {
    (createTocProject as jest.Mock).mockRejectedValueOnce(
      new Error("Duplicate")
    );

    render(<ProjectsPage />);

    await screen.findByText(/alpha/i);

    fireEvent.click(screen.getByRole("button", { name: /create project \+/i }));
    fireEvent.change(screen.getByPlaceholderText(/project name/i), {
      target: { value: "Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Duplicate");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("clicking Open on a project saves projectId and navigates", async () => {
    render(<ProjectsPage />);

    await screen.findByText(/alpha/i);

    // Click Open for Alpha
    const openButtons = screen.getAllByRole("button", { name: /open/i });
    fireEvent.click(openButtons[0]);

    expect(localStorage.getItem("projectId")).toBe("p1");
    expect(mockNavigate).toHaveBeenCalledWith("/projects/p1");
  });

  it("cancel hides the create form", async () => {
    render(<ProjectsPage />);

    await screen.findByText(/alpha/i);

    fireEvent.click(screen.getByRole("button", { name: /create project \+/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    // Create button shows again
    expect(
      screen.getByRole("button", { name: /create project \+/i })
    ).toBeInTheDocument();
  });
});
