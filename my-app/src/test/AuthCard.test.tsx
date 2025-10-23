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

// ---------- Asset & Footer mocks ----------
jest.mock("../assets/logo.png", () => "logo-mock.png");
jest.mock("../components/Footer", () => () => (
  <div data-testid="footer">FOOTER</div>
));

// ---------- Router mocks (virtual, no real Router needed) ----------
const mockNavigate = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [
      {
        get: (key: string) => mockSearchParams[key] ?? null,
      },
    ],
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "/"} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

// ---------- Auth context mock ----------
const mockSetUser = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}));

// ---------- API mocks ----------
const mockAuthLogin = jest.fn();
const mockAuthRegister = jest.fn();
const mockAuthGoogleLogin = jest.fn();
jest.mock("../services/api", () => ({
  __esModule: true,
  authLogin: (...a: any[]) => mockAuthLogin(...a),
  authRegister: (...a: any[]) => mockAuthRegister(...a),
  authGoogleLogin: (...a: any[]) => mockAuthGoogleLogin(...a),
}));

// ---------- Firebase (Google popup) mock ----------
const mockSignInWithGooglePopup = jest.fn();
jest.mock("../lib/firebase", () => ({
  signInWithGooglePopup: (...a: any[]) => mockSignInWithGooglePopup(...a),
}));

// ---------- SUT ----------
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

// Password that satisfies: >=6, upper, lower, digit, special
const VALID_PASSWORD = "Abcdef1!";
const LOGIN_EMAIL = "user@test.com";
const REG_EMAIL = "reg@test.com";

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockSearchParams = {}; // no redirect/no message by default
});

describe("AuthCard (current)", () => {
  it("shows Sign In by default, with forgot-password and Google; submit present", () => {
    render(<AuthCard />);

    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

    // updated URL in your component: /forgot-password
    expect(
      screen.getByRole("link", { name: /forgot password\?/i })
    ).toHaveAttribute("href", "/forgot-password");

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();

    expect(getSubmit(/sign in/i)).toBeInTheDocument();
  });

  it("switches to Create Account and shows extra fields (username, confirm, checkboxes) & hides forgot/Google", () => {
    render(<AuthCard />);

    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    // login-only stuff hidden
    expect(
      screen.queryByRole("link", { name: /forgot password/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continue with google/i })
    ).not.toBeInTheDocument();

    expect(getSubmit(/create account/i)).toBeInTheDocument();
  });

  it("login: client validation shows email + password errors", async () => {
    render(<AuthCard />);

    // empty submit
    fireEvent.click(getSubmit(/sign in/i));

    // Your component uses validateEmailDetailed -> shows "Email is required." for empty
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    // now email ok but password too weak -> any “Password must …” message is fine
    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, "abc"); // too weak
    fireEvent.click(getSubmit(/sign in/i));

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

    expect(await screen.findByText(/bad creds/i)).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("login: success stores token/user and navigates to '/' (no redirect)", async () => {
    render(<AuthCard />);
    mockAuthLogin.mockResolvedValueOnce({
      token: "login-token",
      user: { email: LOGIN_EMAIL, userId: 9 },
    });

    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    fireEvent.click(getSubmit(/sign in/i));

    await waitFor(() => expect(mockAuthLogin).toHaveBeenCalled());

    expect(localStorage.getItem("token")).toBe("login-token");
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    expect(stored.userId).toBe(9);

    expect(mockSetUser).toHaveBeenCalledWith({ email: LOGIN_EMAIL, userId: 9 });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("login: shows loading state text while submitting", async () => {
    render(<AuthCard />);
    let resolveLogin!: (v?: unknown) => void;
    mockAuthLogin.mockReturnValueOnce(
      new Promise((res) => (resolveLogin = res))
    );

    type(/email address/i, LOGIN_EMAIL);
    type(/^password$/i, VALID_PASSWORD);
    fireEvent.click(getSubmit(/sign in/i));

    expect(getSubmit(/signing in\.\.\./i)).toBeDisabled();

    resolveLogin({ token: "t", user: { email: LOGIN_EMAIL, userId: 1 } });
    await waitFor(() => expect(mockSetUser).toHaveBeenCalled());
  });

  it("register: validates first/last/org/username, T&C, and password match", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    // Fill email + valid password, confirm mismatch; leave other fields blank initially
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
      await screen.findByText(/please choose a username/i)
    ).toBeInTheDocument();

    type(/username/i, "gracehopper");
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/you must accept the terms/i)
    ).toBeInTheDocument();

    // Accept T&C
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }));

    // Now it should reach the "passwords do not match"
    fireEvent.click(getSubmit(/create account/i));
    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument();
  });

  it("register: successful flow stores token/user and navigates (also checks redirect query)", async () => {
    // Use a redirect param to verify useSearchParams path
    mockSearchParams = { redirect: "dashboard" };

    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: /create account/i }));

    mockAuthRegister.mockResolvedValueOnce({
      token: "reg-token",
      user: { id: 42, email: REG_EMAIL, userId: 42, username: "gracehopper" },
    });

    type(/first name/i, "Grace");
    type(/last name/i, "Hopper");
    type(/email address/i, REG_EMAIL);
    type(/organisation/i, "Navy");
    type(/username/i, "gracehopper");
    type(/^password$/i, VALID_PASSWORD);
    type(/confirm password/i, VALID_PASSWORD);

    // Accept T&C
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }));

    fireEvent.click(getSubmit(/create account/i));

    await waitFor(() => {
      expect(mockAuthRegister).toHaveBeenCalledWith({
        email: REG_EMAIL,
        password: VALID_PASSWORD,
        firstName: "Grace",
        lastName: "Hopper",
        organisation: "Navy",
        username: "gracehopper",
        acceptTandC: true,
        newsLetterSubs: false,
      });
    });

    expect(localStorage.getItem("token")).toBe("reg-token");
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    expect(stored.userId).toBe(42);
    expect(stored.username).toBe("gracehopper");

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, username: "gracehopper" })
    );
    // redirect=/dashboard  -> path "/dashboard"
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
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
    type(/username/i, "abc");
    type(/^password$/i, VALID_PASSWORD);
    type(/confirm password/i, VALID_PASSWORD);
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }));

    fireEvent.click(getSubmit(/create account/i));

    expect(await screen.findByText(/email in use/i)).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("login: Google button calls signInWithGooglePopup and authGoogleLogin then navigates", async () => {
    render(<AuthCard />);

    mockSignInWithGooglePopup.mockResolvedValueOnce({
      idToken: "id-token-123",
    });
    mockAuthGoogleLogin.mockResolvedValueOnce({
      token: "google-backend-token",
      user: { email: "g@x.com", userId: 7 },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    await waitFor(() => expect(mockSignInWithGooglePopup).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockAuthGoogleLogin).toHaveBeenCalledWith("id-token-123")
    );

    expect(localStorage.getItem("token")).toBe("google-backend-token");
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    expect(stored.userId).toBe(7);

    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7 })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows message from ?message=... in URL on mount", () => {
    mockSearchParams = { message: "Please log in first" };
    render(<AuthCard />);
    expect(screen.getByText(/please log in first/i)).toBeInTheDocument();
  });
});
