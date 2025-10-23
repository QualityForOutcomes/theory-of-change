import React, { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider, useAuth } from "../auth/AuthProvider";

// Mock role-based redirect to prevent actual navigation/assign
const mockHandleRoleRedirect = jest.fn();
const mockDetermineUserRole = jest.fn((u: any) => (u?.user_role || u?.userRole || u?.role || "user"));
jest.mock("../utils/roleRouting", () => ({
  handleRoleBasedRedirect: (user: any, navigate: any) => mockHandleRoleRedirect(user, navigate),
  determineUserRole: (u: any) => mockDetermineUserRole(u),
}));

// Mock API auth calls
const mockAuthLogin = jest.fn();
const mockFetchUserProfile = jest.fn();
jest.mock("../services/api", () => ({
  authLogin: (payload: any) => mockAuthLogin(payload),
  fetchUserProfile: () => mockFetchUserProfile(),
}));

// Harness to expose context to the test
function Harness({ onReady }: { onReady: (ctx: any) => void }) {
  const ctx = useAuth();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
}

function renderWithProvider(onReady: (ctx: any) => void) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Harness onReady={onReady} />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("login sets token and user, stores to localStorage, skips redirect when requested", async () => {
    mockAuthLogin.mockResolvedValue({
      token: "token123",
      user: { email: "admin@example.com", user_role: "admin", userId: "42" },
    });
    mockFetchUserProfile.mockResolvedValue({
      email: "admin@example.com",
      user_role: "admin",
      userId: "42",
    });

    let ctx: any;
    renderWithProvider((c) => (ctx = c));

    await ctx.login("admin@example.com", "Secret@123", true);

    // Context state updated
    await waitFor(() => expect(ctx.token).toBe("token123"));
    await waitFor(() =>
      expect(ctx.user).toEqual(
        expect.objectContaining({ email: "admin@example.com", role: "admin", userId: "42" })
      )
    );
    await waitFor(() => expect(ctx.isAuthenticated).toBe(true));

    // LocalStorage reflected
    await waitFor(() => expect(localStorage.getItem("token")).toBe("token123"));
    const storedUser = JSON.parse(String(localStorage.getItem("user")));
    expect(storedUser).toEqual(expect.objectContaining({ email: "admin@example.com", role: "admin" }));

    // No redirect when skipRedirect=true
    expect(mockHandleRoleRedirect).not.toHaveBeenCalled();
  });

  test("logout clears auth state and localStorage", async () => {
    // Seed initial auth in localStorage (provider hydrates on mount)
    localStorage.setItem("token", "seed-token");
    localStorage.setItem("user", JSON.stringify({ email: "user@example.com", userId: 1 }));

    let ctx: any;
    renderWithProvider((c) => (ctx = c));

    // Ensure hydrated
    await waitFor(() => expect(ctx.isAuthenticated).toBe(true));

    ctx.logout();

    await waitFor(() => expect(ctx.isAuthenticated).toBe(false));
    expect(ctx.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("userId")).toBeNull();
  });

  test("startup auto-login hydrates user from profile when token exists and user missing", async () => {
    localStorage.setItem("token", "tok-abc");
    // No 'user' key -> should fetch profile
    mockFetchUserProfile.mockResolvedValue({
      email: "demo@example.com",
      user_role: "user",
      userId: 99,
      firstName: "Demo",
      lastName: "User",
    });

    let ctx: any;
    renderWithProvider((c) => (ctx = c));

    await waitFor(() => expect(ctx.loading).toBe(false));

    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.user).toEqual(
      expect.objectContaining({ email: "demo@example.com", role: "user", userId: 99 })
    );
    expect(localStorage.getItem("user")).toBeTruthy();
  });
});