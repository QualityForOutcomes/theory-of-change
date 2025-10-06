// Ensures that the forgot password link is visible and points to the right url

import { render, screen } from "@testing-library/react";
import React from "react";

function ForgotLink() {
  return <a href="/forgot">Forgot Password?</a>;
}

test("forgot link exists and targets /forgot", () => {
  render(<ForgotLink />);
  const link = screen.getByRole("link", { name: /forgot password\?/i });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/forgot");
});
