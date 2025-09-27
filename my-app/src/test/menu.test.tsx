//Ensures that the hamburger shows all the dropdown featurs

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

function HeaderMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <nav>
      <button aria-label="menu" onClick={() => setOpen((o) => !o)}>
        ☰
      </button>
      {open && (
        <ul role="menu">
          <li>
            <button role="menuitem">Profile</button>
          </li>
          <li>
            <button role="menuitem">Logout</button>
          </li>
        </ul>
      )}
    </nav>
  );
}

test("opens menu and shows Profile/Logout", () => {
  render(<HeaderMenu />);
  const toggle = screen.getByRole("button", { name: /menu/i });
  fireEvent.click(toggle);

  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(
    screen.getByRole("menuitem", { name: /profile/i })
  ).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /logout/i })).toBeInTheDocument();
});
