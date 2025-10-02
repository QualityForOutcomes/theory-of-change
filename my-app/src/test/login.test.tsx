// src/test/Login.test.tsx
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- Mock react-router-dom (virtual so no Router needed) ----
const mockNavigate = jest.fn();
let mockLocation: any = { state: { from: { pathname: "/protected" } } };

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
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

// helper: always pick the submit button inside the <form>
const getSubmit = (label: RegExp | string = /sign in/i) => {
  const email = screen.getByPlaceholderText(/you@domain\.com/i);
  const form = email.closest("form") as HTMLFormElement;
  return within(form).getByRole("button", { name: label });
};

describe("Login page (updated)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = { state: { from: { pathname: "/protected" } } }; // reset
  });

  it("renders Sign In mode by default with base fields and forgot-password link", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@domain\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /show password/i })
    ).toBeInTheDocument();

    // specifically assert the submit button inside the form
    expect(getSubmit(/sign in/i)).toBeInTheDocument();

    // Forgot password link visible only in login mode
    expect(
      screen.getByRole("link", { name: /forgot password/i })
    ).toHaveAttribute("href", "/password");

    // Register-specific fields are not present
    expect(
      screen.queryByPlaceholderText(/first name/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/last name/i)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/organisation/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/confirm password/i)
    ).not.toBeInTheDocument();
  });

  it("switches to Create Account (register) mode and shows extra fields; hides forgot-password link", () => {
    render(<Login />);

    // Click the top mode toggle button (outside the form)
    fireEvent.click(
      screen.getAllByRole("button", { name: /create account/i })[0]
    );

    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/organisation/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/confirm password/i)
    ).toBeInTheDocument();

    // Forgot password link hidden in register mode
    expect(
      screen.queryByRole("link", { name: /forgot password/i })
    ).not.toBeInTheDocument();
  });

  it("validates email and password before submitting (login mode)", async () => {
    render(<Login />);

    // Empty submit
    fireEvent.click(getSubmit(/sign in/i));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(authLogin).not.toHaveBeenCalled();

    // Bad password length
    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "123" },
    });
    fireEvent.click(getSubmit(/sign in/i));
    expect(
      await screen.findByText(/password must be at least 6 characters/i)
    ).toBeInTheDocument();
    expect(authLogin).not.toHaveBeenCalled();
  });

  it("toggles password visibility with checkbox", () => {
    render(<Login />);
    const pwd = screen.getByPlaceholderText(/^password$/i) as HTMLInputElement;
    const toggle = screen.getByRole("checkbox", { name: /show password/i });

    expect(pwd.type).toBe("password");
    fireEvent.click(toggle);
    expect(pwd.type).toBe("text");
    fireEvent.click(toggle);
    expect(pwd.type).toBe("password");
  });

  it("successful login: calls authLogin, then login(token, JSON.stringify(user)), and navigates to redirectTo in location.state", async () => {
    (authLogin as jest.Mock).mockResolvedValueOnce({
      token: "fake-token",
      user: { id: 1, email: "user@test.com" },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(getSubmit(/sign in/i));

    await waitFor(() => {
      expect(authLogin).toHaveBeenCalledTimes(1);
      expect(authLogin).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret123",
      });
    });

    expect(mockLogin).toHaveBeenCalledWith(
      "fake-token",
      JSON.stringify({ id: 1, email: "user@test.com" })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/protected", { replace: true });
  });

  it("navigates to '/' when no redirect state is provided", async () => {
    mockLocation = {}; // simulate no state

    (authLogin as jest.Mock).mockResolvedValueOnce({
      token: "t",
      user: { id: 7, email: "u@t.com" },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "u@t.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "abcdef" },
    });

    fireEvent.click(getSubmit(/sign in/i));

    await waitFor(() => expect(authLogin).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows API error message when authLogin rejects with response.data.error.message", async () => {
    (authLogin as jest.Mock).mockRejectedValueOnce({
      response: { data: { error: { message: "Invalid credentials" } } },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(getSubmit(/sign in/i));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("falls back to generic error when rejection is a plain Error", async () => {
    (authLogin as jest.Mock).mockRejectedValueOnce(new Error("Network down"));

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(getSubmit(/sign in/i));

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("register mode validations (first name, last name, organisation, matching passwords)", async () => {
    render(<Login />);

    // Click the top mode toggle button (outside the form)
    fireEvent.click(
      screen.getAllByRole("button", { name: /create account/i })[0]
    );

    // set only email + passwords (mismatch), leave names/org empty to trigger validations in order
    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "abcdef" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
      target: { value: "zzz999" },
    });

    // submit (the one inside the form)
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your first name/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/first name/i), {
      target: { value: "Ada" },
    });
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your last name/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/last name/i), {
      target: { value: "Lovelace" },
    });
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your organisation name/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/organisation/i), {
      target: { value: "Analytical Engines" },
    });
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    let resolveFn!: (v?: unknown) => void;
    (authLogin as jest.Mock).mockReturnValueOnce(
      new Promise((res) => {
        resolveFn = res;
      })
    );

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/you@domain\.com/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), {
      target: { value: "abcdef" },
    });

    fireEvent.click(getSubmit(/sign in/i));

    // Loading text shown on submit button
    expect(getSubmit(/please wait/i)).toBeDisabled();

    // finish request
    resolveFn({ token: "t", user: { id: 1, email: "user@test.com" } });

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });
});
