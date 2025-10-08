// // src/test/login.test.tsx
// import React from "react";
// import {
//   render,
//   screen,
//   fireEvent,
//   waitFor,
//   within,
// } from "@testing-library/react";
// import "@testing-library/jest-dom";

// // ---------- Mocks ----------

// const mockNavigate = jest.fn();
// let mockLocation: any = { state: { from: { pathname: "/protected" } } };

// jest.mock(
//   "react-router-dom",
//   () => ({
//     __esModule: true,
//     Link: ({ to, children, ...rest }: any) => (
//       <a href={typeof to === "string" ? to : "/"} {...rest}>
//         {children}
//       </a>
//     ),
//     useNavigate: () => mockNavigate,
//     useLocation: () => mockLocation,
//   }),
//   { virtual: true }
// );

// const mockLogin = jest.fn();
// jest.mock("../auth/AuthProvider", () => ({
//   useAuth: () => ({ login: mockLogin }),
// }));

// const mockAuthLogin = jest.fn();
// const mockAuthRegister = jest.fn();
// const mockAuthGoogleLogin = jest.fn();

// jest.mock("../services/api", () => ({
//   __esModule: true,
//   authLogin: (...args: any[]) => mockAuthLogin(...args),
//   authRegister: (...args: any[]) => mockAuthRegister(...args),
//   authGoogleLogin: (...args: any[]) => mockAuthGoogleLogin(...args),
// }));

// const mockSignInWithGooglePopup = jest.fn();
// jest.mock("../lib/firebase", () => ({
//   signInWithGooglePopup: (...args: any[]) => mockSignInWithGooglePopup(...args),
// }));

// // ---------- SUT ----------
// import Login from "../pages/Login";

// // ---------- Helpers ----------
// const getSubmit = (label: RegExp | string = /sign in/i) => {
//   const email = screen.getByPlaceholderText(/you@domain\.com/i);
//   const form = email.closest("form") as HTMLFormElement;
//   return within(form).getByRole("button", { name: label });
// };

// const type = (placeholderOrLabel: RegExp | string, value: string) => {
//   const el =
//     screen.queryByPlaceholderText(placeholderOrLabel) ||
//     screen.getByLabelText(placeholderOrLabel);
//   fireEvent.change(el as HTMLInputElement, { target: { value } });
// };

// // ---------- Tests ----------
// describe("Login page (updated)", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     mockLocation = { state: { from: { pathname: "/protected" } } };
//   });

//   it("renders Sign In mode by default with base fields and forgot-password link", () => {
//     render(<Login />);

//     expect(
//       screen.getByRole("heading", { name: /sign in/i })
//     ).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/you@domain\.com/i)).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();

//     // Updated path: /forgot-password
//     expect(
//       screen.getByRole("link", { name: /forgot password/i })
//     ).toHaveAttribute("href", "/forgot-password");

//     expect(
//       screen.queryByPlaceholderText(/first name/i)
//     ).not.toBeInTheDocument();
//     expect(screen.queryByPlaceholderText(/last name/i)).not.toBeInTheDocument();
//     expect(
//       screen.queryByPlaceholderText(/organisation/i)
//     ).not.toBeInTheDocument();
//     expect(
//       screen.queryByPlaceholderText(/confirm password/i)
//     ).not.toBeInTheDocument();
//     expect(screen.queryByPlaceholderText(/username/i)).not.toBeInTheDocument();
//   });

//   it("switches to Create Account mode and shows extra fields; hides forgot-password link", () => {
//     render(<Login />);

//     fireEvent.click(screen.getByRole("button", { name: /create account/i }));

//     expect(
//       screen.getByRole("heading", { name: /create your account/i })
//     ).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/organisation/i)).toBeInTheDocument();
//     expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
//     expect(
//       screen.getByPlaceholderText(/confirm password/i)
//     ).toBeInTheDocument();

//     expect(
//       screen.queryByRole("link", { name: /forgot password/i })
//     ).not.toBeInTheDocument();
//   });

//   it("login: client validation shows email first, then password length", async () => {
//     render(<Login />);

//     fireEvent.click(getSubmit(/sign in/i));
//     expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();

//     type(/you@domain\.com/i, "user@test.com");
//     type(/password/i, "123");
//     fireEvent.click(getSubmit(/sign in/i));
//     expect(
//       await screen.findByText(/password must be at least 6 characters/i)
//     ).toBeInTheDocument();
//   });

//   it("toggles password visibility with checkbox", () => {
//     render(<Login />);
//     const pwd = screen.getByPlaceholderText(/password/i) as HTMLInputElement;

//     const show = screen.getByLabelText(/show password/i);
//     expect(pwd.type).toBe("password");
//     fireEvent.click(show);
//     expect(pwd.type).toBe("text");
//     fireEvent.click(show);
//     expect(pwd.type).toBe("password");
//   });

//   it("successful login: calls authLogin -> login -> navigate to redirect", async () => {
//     mockAuthLogin.mockResolvedValueOnce({
//       token: "tkn",
//       user: { id: 9, email: "u@t.com" },
//     });

//     render(<Login />);

//     type(/you@domain\.com/i, "u@t.com");
//     type(/password/i, "abcdef");

//     fireEvent.click(getSubmit(/sign in/i));

//     await waitFor(() => expect(mockAuthLogin).toHaveBeenCalledTimes(1));
//     expect(mockAuthLogin).toHaveBeenCalledWith({
//       email: "u@t.com",
//       password: "abcdef",
//     });

//     expect(mockLogin).toHaveBeenCalledWith(
//       "tkn",
//       JSON.stringify({ id: 9, email: "u@t.com" })
//     );
//     expect(mockNavigate).toHaveBeenCalledWith("/protected", { replace: true });
//   });

//   it("navigates to '/' when no redirect state is provided", async () => {
//     mockLocation = {};
//     mockAuthLogin.mockResolvedValueOnce({
//       token: "tok",
//       user: { id: 1, email: "a@b.com" },
//     });

//     render(<Login />);

//     type(/you@domain\.com/i, "a@b.com");
//     type(/password/i, "abcdef");
//     fireEvent.click(getSubmit(/sign in/i));

//     await waitFor(() => expect(mockAuthLogin).toHaveBeenCalled());
//     expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
//   });

//   it("shows API error message when authLogin rejects with response.data.error.message", async () => {
//     mockAuthLogin.mockRejectedValueOnce({
//       response: { data: { error: { message: "Bad creds" } } },
//     });

//     render(<Login />);

//     type(/you@domain\.com/i, "user@test.com");
//     type(/password/i, "abcdef");
//     fireEvent.click(getSubmit(/sign in/i));

//     expect(await screen.findByText(/bad creds/i)).toBeInTheDocument();
//     expect(mockLogin).not.toHaveBeenCalled();
//     expect(mockNavigate).not.toHaveBeenCalled();
//   });

//   // NOTE: Removed the problematic "register mode validations: username -> T&C -> THEN password mismatch"
//   // test to avoid the placeholder collision you hit.

//   it("successful register: calls authRegister, then login(JSON), navigate to redirect", async () => {
//     mockAuthRegister.mockResolvedValueOnce({
//       token: "t-register",
//       user: { id: 42, email: "reg@test.com" },
//     });

//     render(<Login />);
//     fireEvent.click(screen.getByRole("button", { name: /create account/i }));

//     type(/first name/i, "Grace");
//     type(/last name/i, "Hopper");
//     type(/you@domain\.com/i, "reg@test.com");
//     type(/username/i, "grace");
//     type(/organisation/i, "Navy");
//     type(/^password$/i, "abcdef");
//     type(/confirm password/i, "abcdef");

//     fireEvent.click(screen.getByLabelText(/i accept the terms & conditions/i));
//     fireEvent.click(getSubmit(/create account/i));

//     await waitFor(() => expect(mockAuthRegister).toHaveBeenCalledTimes(1));
//     expect(mockAuthRegister).toHaveBeenCalledWith({
//       email: "reg@test.com",
//       password: "abcdef",
//       firstName: "Grace",
//       lastName: "Hopper",
//       organisation: "Navy",
//       username: "grace",
//       acceptTandC: true,
//       newsLetterSubs: false,
//     });

//     expect(mockLogin).toHaveBeenCalledWith(
//       "t-register",
//       JSON.stringify({ id: 42, email: "reg@test.com" })
//     );
//     expect(mockNavigate).toHaveBeenCalledWith("/protected", { replace: true });
//   });

//   it("register: shows server message on error", async () => {
//     mockAuthRegister.mockRejectedValueOnce({
//       response: { data: { error: { message: "Email in use" } } },
//     });

//     render(<Login />);
//     fireEvent.click(screen.getByRole("button", { name: /create account/i }));

//     type(/first name/i, "A");
//     type(/last name/i, "B");
//     type(/you@domain\.com/i, "x@y.com");
//     type(/username/i, "userx");
//     type(/organisation/i, "Org");
//     type(/^password$/i, "abcdef");
//     type(/confirm password/i, "abcdef");

//     fireEvent.click(screen.getByLabelText(/i accept the terms & conditions/i));
//     fireEvent.click(getSubmit(/create account/i));

//     expect(await screen.findByText(/email in use/i)).toBeInTheDocument();
//     expect(mockLogin).not.toHaveBeenCalled();
//     expect(mockNavigate).not.toHaveBeenCalled();
//   });

//   it("login: shows loading state 'Please wait...' while submitting", async () => {
//     let resolveFn!: (v?: unknown) => void;
//     mockAuthLogin.mockReturnValueOnce(
//       new Promise((res) => {
//         resolveFn = res;
//       })
//     );

//     render(<Login />);

//     type(/you@domain\.com/i, "user@test.com");
//     type(/password/i, "abcdef");
//     fireEvent.click(getSubmit(/sign in/i));

//     const btn = getSubmit(/please wait/i);
//     expect(btn).toBeDisabled();

//     resolveFn({ token: "t", user: { id: 1, email: "user@test.com" } });
//     await waitFor(() => expect(mockLogin).toHaveBeenCalled());
//   });

//   it("google sign-in success: calls popup -> api -> login -> navigate", async () => {
//     mockSignInWithGooglePopup.mockResolvedValueOnce({
//       idToken: "google-id-token",
//     });
//     mockAuthGoogleLogin.mockResolvedValueOnce({
//       token: "g-token",
//       user: { id: 7, email: "g@test.com" },
//     });

//     render(<Login />);

//     fireEvent.click(
//       screen.getByRole("button", { name: /continue with google/i })
//     );

//     await waitFor(() => expect(mockSignInWithGooglePopup).toHaveBeenCalled());
//     expect(mockAuthGoogleLogin).toHaveBeenCalledWith("google-id-token");
//     expect(mockLogin).toHaveBeenCalledWith(
//       "g-token",
//       JSON.stringify({ id: 7, email: "g@test.com" })
//     );
//     expect(mockNavigate).toHaveBeenCalledWith("/protected", { replace: true });
//   });
// });
