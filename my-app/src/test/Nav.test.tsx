// src/test/Nav.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- Mock react-router-dom (virtual so no Router needed) ----
jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    // Minimal Link so href checks work
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "/"} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

// ---- Mock AuthProvider hook ----
const mockUseAuth = jest.fn();
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

// ---- Mock CSS & asset imports ----
jest.mock("../style/Nav.css", () => ({}), { virtual: true });
jest.mock("../assets/logo.png", () => "logo-mock.png", { virtual: true });

// ---- SUT ----
import Navbar from "../components/Nav";

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders logo and title; hides hamburger/menu when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<Navbar />);

    // Title present
    expect(
      screen.getByRole("heading", { name: /quality for outcomes/i })
    ).toBeInTheDocument();

    // Logo present
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();

    // Hamburger shouldn't exist when logged out
    expect(document.querySelector(".hamburger")).not.toBeInTheDocument();

    // Menu container also shouldn't exist
    expect(document.querySelector(".menu-content")).not.toBeInTheDocument();
  });

  it("shows hamburger when user is logged in; toggles menu 'visible' class and contains links", () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, name: "Testy" } });

    render(<Navbar />);

    // Hamburger exists
    const hamburger = document.querySelector(".hamburger") as HTMLElement;
    expect(hamburger).toBeInTheDocument();

    // Menu container exists but should NOT have 'visible' initially
    const menu = document.querySelector(".menu-content") as HTMLElement;
    expect(menu).toBeInTheDocument();
    expect(menu.classList.contains("visible")).toBe(false);

    // Click hamburger -> menu opens (gains 'visible' class)
    fireEvent.click(hamburger);
    expect(menu.classList.contains("visible")).toBe(true);

    // Links present with correct hrefs
    const profileLink = screen.getByRole("link", { name: /profile/i });
    const logoutLink = screen.getByRole("link", { name: /logout/i });
    expect(profileLink).toHaveAttribute("href", "/profile");
    expect(logoutLink).toHaveAttribute("href", "/logout");

    // Click hamburger again -> menu closes (loses 'visible')
    fireEvent.click(hamburger);
    expect(menu.classList.contains("visible")).toBe(false);
  });

  it("clicking a menu item closes the menu (Profile link removes 'visible')", () => {
    mockUseAuth.mockReturnValue({ user: { id: 2, name: "User" } });

    render(<Navbar />);

    const hamburger = document.querySelector(".hamburger") as HTMLElement;
    const menu = document.querySelector(".menu-content") as HTMLElement;

    // Open menu
    fireEvent.click(hamburger);
    expect(menu.classList.contains("visible")).toBe(true);

    // Click Profile link (onClick handler sets menuOpen(false))
    const profileLink = screen.getByRole("link", { name: /profile/i });
    fireEvent.click(profileLink);

    // Menu should now be closed
    expect(menu.classList.contains("visible")).toBe(false);
  });
});
