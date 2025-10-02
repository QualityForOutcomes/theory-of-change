// src/test/AuthCard.test.tsx
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------- Mocks ----------

// Mock static asset (logo)
jest.mock("../assets/logo.png", () => "logo-mock.png");

// Mock Footer to keep DOM simple
jest.mock("../components/Footer", () => () => (
  <div data-testid="footer">FOOTER</div>
));

// Mock react-router-dom (virtual, no Router needed)
const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "/"} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

// Mock AuthProvider: only setUser is used in AuthCard
const mockSetUser = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}));

// Mock Firebase Google sign-in
const mockSignInWithPopup = jest.fn();
jest.mock("firebase/auth", () => ({
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
}));
jest.mock("../lib/firebase", () => ({
  auth: {},
  googleProvider: {},
}));

// Mock API: authLogin / authRegister
const mockAuthLogin = jest.fn();
const mockAuthRegister = jest.fn();
jest.mock("../services/api", () => ({
  __esModule: true,
  authLogin: (...args: any[]) => mockAuthLogin(...args),
  authRegister: (...args: any[]) => mockAuthRegister(...args),
}));

// SUT
import AuthCard from "../components/AuthCard";

// ---------- Helpers ----------
const getSubmit = (label: RegExp | string) => {
  const email = screen.getByLabelText(/email address/i);
  const form = email.closest("form") as HTMLFormElement;
  return within(form).getByRole("button", { name: label });
};

const type = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

// Use a password that satisfies stricter validation:
// - length >= 6
// - has upper, lower, digit, special
const VALID_PASSWORD = "Abcdef1!";
const REG_EMAIL = "reg@test.com";
const LOGIN_EMAIL = "user@test.com";

// ---------- Tests ----------
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("AuthCard", () => {
  it("renders Sign In mode by default with forgot-password and Google button", () => {
    render(<AuthCard />);

    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

    // forgot password link in login mode only
    expect(
      screen.getByRole("link", { name: /forgot password\?/i })
    ).toHaveAttribute("href", "/password");

    // Google button visible in login mode
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();

    // Submit button in form
    expect(getSubmit(/sign in/i)).toBeInTheDocument();
  });

  it("switches to register mode and shows extra fields (no forgot-password/Google)", () => {
    render(<AuthCard />);

    // switch to register
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    // login-only bits should be gone
    expect(
      screen.queryByRole("link", { name: /forgot password/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continue with google/i })
    ).not.toBeInTheDocument();

    expect(getSubmit(/create account/i)).toBeInTheDocument();
  });

  it("login: client validation shows email + password error text", async () => {
    render(<AuthCard />);
    // empty submit
    fireEvent.click(getSubmit(/sign in/i));

    // Component currently shows "Email is required." for empty email
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    // Now set email but use clearly invalid password so it fails (exact message may vary)
    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, "abc");
    fireEvent.click(getSubmit(/sign in/i));

    // We don't rely on a specific rule; any “Password must …” error is fine
    expect(await screen.findByText(/password must/i)).toBeInTheDocument();
    expect(mockAuthLogin).not.toHaveBeenCalled();
  });

  it("login: API error shows server message", async () => {
    render(<AuthCard />);
    mockAuthLogin.mockRejectedValueOnce({
      response: { data: { message: "Bad creds" } },
    });

    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    fireEvent.click(getSubmit(/sign in/i));

    // Should pass client validation, call API, then show server error
    expect(await screen.findByText(/bad creds/i)).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("login: successful flow stores token/user and navigates to '/'", async () => {
    render(<AuthCard />);
    mockAuthLogin.mockResolvedValueOnce({
      token: "login-token",
      user: { email: LOGIN_EMAIL, userId: 9 },
    });

    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    fireEvent.click(getSubmit(/sign in/i));

    await waitFor(() => expect(mockAuthLogin).toHaveBeenCalled());

    // localStorage + setUser + navigation
    expect(localStorage.getItem("token")).toBe("login-token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    expect(storedUser.userId).toBe(9);
    expect(mockSetUser).toHaveBeenCalledWith({ email: LOGIN_EMAIL, userId: 9 });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("register: validates first/last/org and password match", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    // Fill email + valid password but leave names/org empty and confirm mismatch
    type(/email address/i, REG_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    type(/confirm password/i, "Mismatch1!");

    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your first name/i)
    ).toBeInTheDocument();

    type(/first name/i, "Grace");
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your last name/i)
    ).toBeInTheDocument();

    type(/last name/i, "Hopper");
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/please enter your organisation name/i)
    ).toBeInTheDocument();

    type(/organisation/i, "Navy");
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument();
  });

  it("register: successful flow stores token/user, calls setUser, navigates to '/'", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    mockAuthRegister.mockResolvedValueOnce({
      token: "reg-token",
      user: { id: 42, email: REG_EMAIL, userId: 42 },
    });

    type(/first name/i, "Grace");
    type(/last name/i, "Hopper");
    type(/email address/i, REG_EMAIL);
    type(/organisation/i, "Navy");
    type(/^password$/i, VALID_PASSWORD);
    type(/confirm password/i, VALID_PASSWORD);

    fireEvent.click(getSubmit(/create account/i));

    await waitFor(() => {
      expect(mockAuthRegister).toHaveBeenCalledWith({
        email: REG_EMAIL,
        password: VALID_PASSWORD,
        firstName: "Grace",
        lastName: "Hopper",
        org: "Navy",
      });
    });

    // token + mapped user + setUser + redirect
    expect(localStorage.getItem("token")).toBe("reg-token");
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    expect(stored.userId).toBe(42);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });

    // We intentionally do NOT assert "Account created!" because you navigate immediately
  });

  it("register: shows server message on error", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    mockAuthRegister.mockRejectedValueOnce({
      response: { data: { message: "Email in use" } },
    });

    type(/first name/i, "A");
    type(/last name/i, "B");
    type(/email address/i, "x@y.com");
    type(/organisation/i, "Org");
    type(/^password$/i, VALID_PASSWORD);
    type(/confirm password/i, VALID_PASSWORD);

    fireEvent.click(getSubmit(/create account/i));

    expect(await screen.findByText(/email in use/i)).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("login: shows loading state while submitting", async () => {
    render(<AuthCard />);
    let resolver!: (v?: unknown) => void;
    mockAuthLogin.mockReturnValueOnce(new Promise((res) => (resolver = res)));

    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    fireEvent.click(getSubmit(/sign in/i));

    // Loading text on submit button
    expect(getSubmit(/signing in\.\.\./i)).toBeDisabled();

    // Resolve API
    resolver({ token: "t", user: { email: LOGIN_EMAIL, userId: 1 } });
    await waitFor(() => expect(mockSetUser).toHaveBeenCalled());
  });

  it("login: Google button triggers signInWithPopup and navigates", async () => {
    render(<AuthCard />);
    mockSignInWithPopup.mockResolvedValueOnce({
      user: { email: "g@x.com", uid: "g-uid" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    await waitFor(() => expect(mockSignInWithPopup).toHaveBeenCalled());
    expect(localStorage.getItem("token")).toMatch(/^google-/);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "g@x.com", id: "g-uid", userId: 0 })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
