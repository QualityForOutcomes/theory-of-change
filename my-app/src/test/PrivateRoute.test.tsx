// src/test/PrivateRoute.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import PrivateRoute from "../auth/PrivateRoute"; // ← adjust if your path differs
import { useAuth } from "../auth/AuthProvider"; // ← adjust if your path differs

// 👇 Virtual mock: Jest won't try to resolve the real package
jest.mock(
  "react-router-dom",
  () => ({
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to} />
    ),
  }),
  { virtual: true }
);

// Mock useAuth
jest.mock("../auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));
const mockUseAuth = useAuth as jest.Mock;

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(
      <PrivateRoute>
        <div>Secret</div>
      </PrivateRoute>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <PrivateRoute>
        <div>Secret</div>
      </PrivateRoute>
    );

    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    const nav = screen.getByTestId("navigate");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-to", "/login");
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { userId: 1, email: "test@test.com" },
      loading: false,
    });

    render(
      <PrivateRoute>
        <div>Secret</div>
      </PrivateRoute>
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});
