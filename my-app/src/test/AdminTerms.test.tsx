// src/test/AdminTerms.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// --- Mocks ---
jest.mock("../services/api", () => ({
  __esModule: true,
  fetchTerms: jest.fn(),
  updateTerms: jest.fn(),
}));
import { fetchTerms, updateTerms } from "../services/api";

jest.mock("../auth/AuthProvider", () => ({
  __esModule: true,
  useAuth: () => mockAuth,
}));

// Mock auth state
let mockAuth = { isAuthenticated: true };

// Component under test
import AdminTerms from "../pages/AdminTerms";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminTerms page", () => {
  it("loads terms on mount and shows textarea with content", async () => {
    (fetchTerms as jest.Mock).mockResolvedValueOnce({
      content: "Initial terms text",
    });

    render(<AdminTerms />);

    expect(
      screen.getByRole("heading", { name: /edit terms/i })
    ).toBeInTheDocument();

    // Wait for fetchTerms to resolve
    await waitFor(() =>
      expect(
        screen.getByDisplayValue(/initial terms text/i)
      ).toBeInTheDocument()
    );
  });

  it("shows alert if user not authenticated when trying to save", async () => {
    (fetchTerms as jest.Mock).mockResolvedValueOnce({ content: "" });
    mockAuth = { isAuthenticated: false };

    render(<AdminTerms />);

    await waitFor(() => screen.getByRole("textbox"));

    // Spy on alert
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "You must be signed in as an admin to update terms."
    );

    alertSpy.mockRestore();
  });

  it("saves updated terms when authenticated", async () => {
    (fetchTerms as jest.Mock).mockResolvedValueOnce({ content: "Old terms" });
    mockAuth = { isAuthenticated: true };

    render(<AdminTerms />);

    const textarea = await screen.findByDisplayValue(/old terms/i);
    fireEvent.change(textarea, { target: { value: "New updated terms" } });

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateTerms).toHaveBeenCalledWith("New updated terms")
    );

    expect(alertSpy).toHaveBeenCalledWith("Terms updated!");
    alertSpy.mockRestore();
  });
});
