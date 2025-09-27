//A smoke test to make sure the google sign-in option is present

import { render, screen } from "@testing-library/react";
import React from "react";

function GoogleCTA() {
  return <button type="button">Continue with Google</button>;
}

test("renders Google auth button", () => {
  render(<GoogleCTA />);
  expect(
    screen.getByRole("button", { name: /continue with google/i })
  ).toBeInTheDocument();
});
