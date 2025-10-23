// src/test/Logout.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- Mock react-router-dom (virtual so no Router needed) ----
const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

// ---- Mock AuthProvider hook ----
const mockLogout = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

// ---- SUT ----
import Logout from "../pages/Logout";

describe("Logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls logout on mount and navigates to /login", async () => {
    render(<Logout />);

    // UI hint shows immediately
    expect(screen.getByText(/signing out/i)).toBeInTheDocument();

    // Effect runs: logout + navigate
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
