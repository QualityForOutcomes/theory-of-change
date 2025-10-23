import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mocks BEFORE imports
const mockNavigate = jest.fn();
let mockLocation: any = { state: undefined, pathname: "/login", search: "", hash: "", key: "default" };
const mockProviderLogin = jest.fn();
const mockAuthLogin = jest.fn();
const mockAuthGoogleLogin = jest.fn();
const mockSignInWithGooglePopup = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ login: mockProviderLogin }),
}));

jest.mock("../services/api", () => ({
  authLogin: (...args: any[]) => mockAuthLogin(...args),
  authGoogleLogin: (...args: any[]) => mockAuthGoogleLogin(...args),
}));

jest.mock("../lib/firebase", () => ({
  signInWithGooglePopup: (...args: any[]) => mockSignInWithGooglePopup(...args),
}));

import Login from "../pages/Login";
import { BrowserRouter } from "react-router-dom";

const renderWithRouter = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockLocation = { state: undefined, pathname: "/login", search: "", hash: "", key: "default" };
  });

  test("shows validation errors for invalid email and short password", async () => {
    renderWithRouter(<Login />);

    const email = screen.getByPlaceholderText(/you@domain.com/i);
    const password = screen.getByPlaceholderText(/password/i);
    const submit = document.querySelector('form button[type="submit"]') as HTMLButtonElement;

    fireEvent.change(email, { target: { value: "invalid" } });
    fireEvent.change(password, { target: { value: "123" } });
    fireEvent.click(submit);

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  test("successful email/password login trims email, calls provider and navigates", async () => {
    mockAuthLogin.mockResolvedValue({
      token: "token123",
      user: { email: "test@example.com", userId: 1, username: "demo" },
    });

    // Redirect to a specific path from location state
    mockLocation = { state: { from: { pathname: "/projects" } } } as any;

    renderWithRouter(<Login />);

    const email = screen.getByPlaceholderText(/you@domain.com/i);
    const password = screen.getByPlaceholderText(/password/i);
    const submit = document.querySelector('form button[type="submit"]') as HTMLButtonElement;

    fireEvent.change(email, { target: { value: "  test@example.com  " } });
    fireEvent.change(password, { target: { value: "123456" } });
    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(mockAuthLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "123456",
      });
    });

    // Component calls provider login with token + JSON user string
    await waitFor(() => {
      expect(mockProviderLogin).toHaveBeenCalledWith(
        "token123",
        JSON.stringify({ email: "test@example.com", userId: 1, username: "demo" })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/projects", { replace: true });
    });
  });

  test("shows backend error message on failed login", async () => {
    mockAuthLogin.mockRejectedValue({
      response: { data: { error: { message: "Invalid credentials" } } },
    });

    renderWithRouter(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "123456" },
    });

    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockProviderLogin).not.toHaveBeenCalled();
  });

  test("Google sign-in calls popup, backend, provider login, and navigates", async () => {
    mockSignInWithGooglePopup.mockResolvedValue({ idToken: "id-token-123" });
    mockAuthGoogleLogin.mockResolvedValue({
      token: "google-token",
      user: { email: "google@example.com", userId: 2 },
    });

    renderWithRouter(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(mockSignInWithGooglePopup).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAuthGoogleLogin).toHaveBeenCalledWith("id-token-123");
    });

    await waitFor(() => {
      expect(mockProviderLogin).toHaveBeenCalledWith(
        "google-token",
        JSON.stringify({ email: "google@example.com", userId: 2 })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  test("toggle Show password switches input type", () => {
    renderWithRouter(<Login />);

    const password = screen.getByPlaceholderText(/password/i);
    const showToggle = screen.getByRole("checkbox", { name: /show password/i });

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(showToggle);
    expect(password).toHaveAttribute("type", "text");
  });
});