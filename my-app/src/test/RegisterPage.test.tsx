import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mocks BEFORE imports
const mockNavigate = jest.fn();
let mockLocation: any = { state: undefined, pathname: "/login", search: "", hash: "", key: "default" };
const mockProviderLogin = jest.fn();
const mockAuthRegister = jest.fn();

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
  authRegister: (...args: any[]) => mockAuthRegister(...args),
}));

import Login from "../pages/Login";
import { BrowserRouter } from "react-router-dom";

const renderWithRouter = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

const switchToRegister = () => {
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
};

describe("Register Page (Login component in register mode)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockLocation = { state: undefined, pathname: "/login", search: "", hash: "", key: "default" };
  });

  test("switching to register mode shows all registration fields", () => {
    renderWithRouter(<Login />);
    switchToRegister();

    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@domain.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/organisation/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();

    // Google button should not be visible in register mode
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
  });

  test("requires accepting Terms & Conditions", async () => {
    renderWithRouter(<Login />);
    switchToRegister();

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/you@domain.com/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: "johndoe" } });
    fireEvent.change(screen.getByPlaceholderText(/organisation/i), { target: { value: "Acme" } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "abcdef" } });

    // Do NOT check T&C
    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    expect(await screen.findByText(/you must accept the terms & conditions/i)).toBeInTheDocument();
    expect(mockAuthRegister).not.toHaveBeenCalled();
  });

  test("shows error when confirm password does not match", async () => {
    renderWithRouter(<Login />);
    switchToRegister();

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/you@domain.com/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: "johndoe" } });
    fireEvent.change(screen.getByPlaceholderText(/organisation/i), { target: { value: "Acme" } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "abcxyz" } });

    // Accept T&C to avoid that validation
    const tcLabel = screen.getByLabelText(/i accept the terms & conditions/i);
    fireEvent.click(tcLabel);

    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockAuthRegister).not.toHaveBeenCalled();
  });

  test("successful registration calls authRegister with correct payload and navigates", async () => {
    mockAuthRegister.mockResolvedValue({
      token: "reg-token",
      user: { email: "john@example.com", userId: 10, username: "johndoe" },
    });

    // Redirect from location state
    mockLocation = { state: { from: { pathname: "/projects" } } } as any;

    renderWithRouter(<Login />);
    switchToRegister();

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/you@domain.com/i), { target: { value: "  john@example.com  " } });
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: "johndoe" } });
    fireEvent.change(screen.getByPlaceholderText(/organisation/i), { target: { value: "Acme" } });

    // Accept T&C and subscribe to newsletter
    fireEvent.click(screen.getByLabelText(/i accept the terms & conditions/i));
    fireEvent.click(screen.getByLabelText(/subscribe to newsletter/i));

    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "abcdef" } });

    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(mockAuthRegister).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "abcdef",
        firstName: "John",
        lastName: "Doe",
        organisation: "Acme",
        username: "johndoe",
        acceptTandC: true,
        newsLetterSubs: true,
      });
    });

    await waitFor(() => {
      expect(mockProviderLogin).toHaveBeenCalledWith(
        "reg-token",
        JSON.stringify({ email: "john@example.com", userId: 10, username: "johndoe" })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/projects", { replace: true });
    });
  });

  test("shows backend error on failed registration", async () => {
    mockAuthRegister.mockRejectedValue({
      response: { data: { error: { message: "Registration failed" } } },
    });

    renderWithRouter(<Login />);
    switchToRegister();

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/you@domain.com/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: "johndoe" } });
    fireEvent.change(screen.getByPlaceholderText(/organisation/i), { target: { value: "Acme" } });
    fireEvent.click(screen.getByLabelText(/i accept the terms & conditions/i));
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: "abcdef" } });

    fireEvent.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    expect(await screen.findByText(/registration failed/i)).toBeInTheDocument();
  });
});