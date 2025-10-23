import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Fully mock react-router-dom to stub Navigate only
jest.mock("react-router-dom", () => ({
  Navigate: ({ to }: any) => <div>Redirected to {to}</div>,
}));

import PrivateRoute from "../auth/PrivateRoute";

// Mock useAuth to control loading and user state
let mockAuth: any = { user: null, loading: false };
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

describe("PrivateRoute", () => {
  beforeEach(() => {
    mockAuth = { user: null, loading: false };
  });

  test("shows loading state when auth is loading", () => {
    mockAuth.loading = true;

    render(
      <PrivateRoute>
        <div>Protected Content</div>
      </PrivateRoute>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("renders children when user is authenticated", () => {
    mockAuth = { user: { email: "test@example.com", userId: 1 }, loading: false };

    render(
      <PrivateRoute>
        <div>Protected Content</div>
      </PrivateRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("redirects to /login when user is unauthenticated", () => {
    mockAuth = { user: null, loading: false };

    render(
      <PrivateRoute>
        <div>Protected Content</div>
      </PrivateRoute>
    );

    expect(screen.getByText("Redirected to /login")).toBeInTheDocument();
  });
});