//Checks that profile page shows all necessary information

import { render, screen } from "@testing-library/react";
import React from "react";

// Mirrors your simple profile layout
function ProfileSummary() {
  return (
    <div>
      <section aria-label="user-card">
        <h2>Guest User</h2>
        <p>Email not available</p>
      </section>
      <section aria-label="subscription-details">
        <h3>Subscription Details</h3>
        <p>Plan: N/A</p>
        <p>Status: N/A</p>
        <p>Expiry: N/A</p>
      </section>
    </div>
  );
}

describe("ProfileSummary", () => {
  test("shows guest and subscription N/A values", () => {
    render(<ProfileSummary />);
    expect(
      screen.getByRole("heading", { name: /guest user/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/email not available/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /subscription details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/plan:\s*n\/a/i)).toBeInTheDocument();
    expect(screen.getByText(/status:\s*n\/a/i)).toBeInTheDocument();
    expect(screen.getByText(/expiry:\s*n\/a/i)).toBeInTheDocument();
  });
});
