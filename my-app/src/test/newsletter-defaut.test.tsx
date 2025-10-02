//Checks that subscribe to newsletter check box is unchecked by default

import { render, screen } from "@testing-library/react";
import React from "react";

function NewsletterOptIn() {
  return (
    <label>
      <input
        type="checkbox"
        aria-label="Subscribe to newsletter"
        defaultChecked={false}
      />
      Subscribe to our newsletter
    </label>
  );
}

test("newsletter checkbox is unchecked by default", () => {
  render(<NewsletterOptIn />);
  const cb = screen.getByLabelText(
    /subscribe to newsletter/i
  ) as HTMLInputElement;
  expect(cb.checked).toBe(false);
});
