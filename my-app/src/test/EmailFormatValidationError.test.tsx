//Types an invalid email and checks that an error message appears

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

function EmailInput() {
  const [email, setEmail] = React.useState("");
  const [err, setErr] = React.useState("");
  const onBlur = () =>
    setErr(/\S+@\S+\.\S+/.test(email) ? "" : "Invalid email");
  return (
    <div>
      <input
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={onBlur}
      />
      {err && <p role="alert">{err}</p>}
    </div>
  );
}

test("shows error for invalid emails", () => {
  render(<EmailInput />);
  const input = screen.getByPlaceholderText(/email address/i);
  fireEvent.change(input, { target: { value: "not-an-email" } });
  fireEvent.blur(input);
  expect(screen.getByRole("alert")).toHaveTextContent(/invalid email/i);
});
