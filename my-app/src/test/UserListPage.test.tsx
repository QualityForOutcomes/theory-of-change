// src/test/UserListPage.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Adjust this import path if your component lives elsewhere
import UserListPage from "../pages/UsersList";

describe("UserListPage", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    // JSDOM doesn't show real alerts; we spy so we can assert calls
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("renders the search input, export button, and table headers", () => {
    render(<UserListPage />);

    // search input present with placeholder
    const searchInput = screen.getByPlaceholderText(/search users/i);
    expect(searchInput).toBeInTheDocument();

    // export button present
    const exportCsvBtn = screen.getByRole("button", { name: /export csv/i });
    expect(exportCsvBtn).toBeInTheDocument();

    // table and its headers present
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // check specific headers
    expect(
      screen.getByRole("columnheader", { name: /id/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /name/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /subscription/i })
    ).toBeInTheDocument();
  });

  it("updates the search query when the user types", () => {
    render(<UserListPage />);

    const searchInput = screen.getByPlaceholderText(
      /search users/i
    ) as HTMLInputElement;

    // initial value should be empty
    expect(searchInput.value).toBe("");

    // type into the input
    fireEvent.change(searchInput, { target: { value: "alice@example.com" } });

    // the input value should reflect the typed text (state update)
    expect(searchInput.value).toBe("alice@example.com");
  });

  it("shows the placeholder row when there is no user data", () => {
    render(<UserListPage />);

    // As the component currently renders a placeholder, assert it
    expect(
      screen.getByText(/user details will be displayed here/i)
    ).toBeInTheDocument();
  });

  it("calls alert with the correct message when Export CSV is clicked", () => {
    render(<UserListPage />);

    const exportCsvBtn = screen.getByRole("button", { name: /export csv/i });
    fireEvent.click(exportCsvBtn);

    // The component currently alerts "Exporting as csv"
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("Exporting as csv");
  });
});
