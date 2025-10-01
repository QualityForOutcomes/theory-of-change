// src/test/Login.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- Hard mock react-router-dom (virtual: no real package needed) ----
const mockNavigate = jest.fn();
const mockLocation = { state: { from: { pathname: "/dashboard" } } };

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    // Minimal <Link> so href checks work
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "/"} {...rest}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }),
  { virtual: true }
);

// ---- Mock AuthProvider hook ----
const mockLogin = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// ---- Mock API ----
jest.mock("../services/api", () => ({
  __esModule: true,
  authLogin: jest.fn(),
}));
import { authLogin } from "../services/api";

// ---- SUT ----
import Login from "../pages/Login";

describe("Login page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders inputs, checkbox, button, and forgot-password link", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@domain\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /show password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i })
    ).toHaveAttribute("href", "/password");
  });

  it("validates email and password before submitting", async () => {
    render(<Login />);

    // Empty form -> click Sign In
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(authLogin).not.toHaveBeenCalled();

    // Fix email but short password
    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText(/password must be at least 6 characters/i)
    ).toBeInTheDocument();
    expect(authLogin).not.toHaveBeenCalled();
  });

  it("toggles password visibility with the checkbox", () => {
    render(<Login />);

    const pwd = screen.getByPlaceholderText(/password/i) as HTMLInputElement;
    const toggle = screen.getByRole("checkbox", { name: /show password/i });

    expect(pwd.type).toBe("password");
    fireEvent.click(toggle);
    expect(pwd.type).toBe("text");
    fireEvent.click(toggle);
    expect(pwd.type).toBe("password");
  });

  it("submits successfully: calls authLogin, calls login(), and navigates to redirectTo", async () => {
    (authLogin as jest.Mock).mockResolvedValueOnce({
      token: "fake-token",
      user: { id: 1, email: "user@test.com" },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(authLogin).toHaveBeenCalledTimes(1);
      expect(authLogin).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret123",
      });
      expect(mockLogin).toHaveBeenCalledWith("fake-token", {
        id: 1,
        email: "user@test.com",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
        replace: true,
      });
    });
  });

  it("shows API error message when authLogin rejects (generic error)", async () => {
    (authLogin as jest.Mock).mockRejectedValueOnce(new Error("Invalid creds"));

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid creds/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows server-provided message when authLogin rejects with response.data.message", async () => {
    (authLogin as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: "Email or password incorrect" } },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/email or password incorrect/i)
    ).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
