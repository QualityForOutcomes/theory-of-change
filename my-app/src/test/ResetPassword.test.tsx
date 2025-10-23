// src/test/ResetPassword.test.tsx
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";

// -------------------------
// Stable react-router-dom mock (virtual; avoids real dependency)
// NOTE: Jest allows referencing variables that start with "mock" from factories.
// -------------------------
const mockNavigate = jest.fn();
let mockSearchParamsObj: Record<string, string | null> = {};

let mockCachedParams = new URLSearchParams();
let mockCachedKey = "";
function mockGetStableSearchParams() {
  const key = JSON.stringify(mockSearchParamsObj);
  if (key !== mockCachedKey) {
    mockCachedKey = key;
    mockCachedParams = new URLSearchParams(
      Object.entries(mockSearchParamsObj).flatMap(([k, v]) =>
        v == null ? [] : [[k, v]]
      )
    );
  }
  return mockCachedParams;
}

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockGetStableSearchParams(), jest.fn()],
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "/"} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

// -------------------------
// Mock API
// -------------------------
jest.mock("../services/api", () => ({
  __esModule: true,
  resetPassword: jest.fn(),
}));
import { resetPassword } from "../services/api";

// -------------------------
// SUT
// -------------------------
import ResetPassword from "../pages/ResetPassword";

// -------------------------
// Helpers
// -------------------------
const type = (labelOrPlaceholder: RegExp | string, value: string) => {
  const el =
    screen.queryByLabelText(labelOrPlaceholder) ||
    screen.queryByPlaceholderText(labelOrPlaceholder);
  fireEvent.change(el as HTMLInputElement, { target: { value } });
};

const getSubmit = (name: RegExp | string = /reset password/i) => {
  const email = screen.getByLabelText(/email address/i);
  const form = email.closest("form") as HTMLFormElement;
  return within(form).getByRole("button", { name });
};

// -------------------------
// Lifecycle
// -------------------------
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
  mockSearchParamsObj = {}; // default: no URL params
  mockCachedParams = new URLSearchParams();
  mockCachedKey = "";
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// -------------------------
// Tests
// -------------------------
describe("ResetPassword (stable router mocks)", () => {
  it("renders base UI and fields", () => {
    render(<ResetPassword />);

    expect(
      screen.getByRole("heading", { name: /reset password/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reset code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(getSubmit()).toBeInTheDocument();
  });

  it("client validation: missing email -> missing token -> weak password", async () => {
    render(<ResetPassword />);

    // Submit all empty
    fireEvent.click(getSubmit());
    expect(
      await screen.findByText(/email is required\. please go back/i)
    ).toBeInTheDocument();

    // Provide email, but no token yet
    type(/email address/i, "user@test.com");
    fireEvent.click(getSubmit());
    expect(
      await screen.findByText(/please enter your reset code/i)
    ).toBeInTheDocument();

    // Provide token + obviously weak password to trigger your validator
    type(/reset code/i, "ABCDEFGH");
    type(/new password/i, "abc");
    type(/confirm new password/i, "abc");
    fireEvent.click(getSubmit());

    // We just assert some password-related error shows
    expect(await screen.findByText(/password/i)).toBeInTheDocument();
  });

  it("prefills email from URL, submits OK, shows success then redirects after 2s", async () => {
    mockSearchParamsObj = { email: "prefill@test.com" };
    (resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });

    render(<ResetPassword />);

    // Email prefilled
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(email.value).toBe("prefill@test.com");

    // Fill valid values (use a password your validator accepts)
    type(/reset code/i, "ABCDEFGH");
    type(/new password/i, "Abcdef1!");
    type(/confirm new password/i, "Abcdef1!");
    fireEvent.click(getSubmit());

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        email: "prefill@test.com",
        token: "ABCDEFGH",
        newPassword: "Abcdef1!",
      });
    });

    expect(
      await screen.findByText(/password reset successful/i)
    ).toBeInTheDocument();

    // redirect after 2s
    expect(mockNavigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("shows server message when API returns success:false", async () => {
    mockSearchParamsObj = { email: "err@test.com" };
    (resetPassword as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: "Invalid code",
    });

    render(<ResetPassword />);

    type(/reset code/i, "ABCDEFGH");
    type(/new password/i, "Abcdef1!");
    type(/confirm new password/i, "Abcdef1!");
    fireEvent.click(getSubmit());

    expect(await screen.findByText(/invalid code/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows thrown error when API rejects", async () => {
    mockSearchParamsObj = { email: "throw@test.com" };
    (resetPassword as jest.Mock).mockRejectedValueOnce(
      new Error("Network down")
    );

    render(<ResetPassword />);

    type(/reset code/i, "ABCDEFGH");
    type(/new password/i, "Abcdef1!");
    type(/confirm new password/i, "Abcdef1!");
    fireEvent.click(getSubmit());

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
