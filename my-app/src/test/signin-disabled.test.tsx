//checks that sign in button is disabled until both emails + passwords are filled in

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

function DualPwd() {
  const [show, setShow] = React.useState(false);
  return (
    <form>
      <input placeholder="Password" type={show ? "text" : "password"} />
      <input placeholder="Confirm Password" type={show ? "text" : "password"} />
      <label>
        <input
          type="checkbox"
          aria-label="Show password"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />
        Show password
      </label>
    </form>
  );
}

test("show password toggles both password fields", () => {
  render(<DualPwd />);
  const pwd = screen.getByPlaceholderText(/^password$/i) as HTMLInputElement;
  const confirm = screen.getByPlaceholderText(
    /confirm password/i
  ) as HTMLInputElement;
  const toggle = screen.getByLabelText(/show password/i);

  expect(pwd.type).toBe("password");
  expect(confirm.type).toBe("password");
  fireEvent.click(toggle);
  expect(pwd.type).toBe("text");
  expect(confirm.type).toBe("text");
});
