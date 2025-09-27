//validates menu open close behaviour

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

function HeaderMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <nav>
      <button
        aria-label="open menu"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        ☰
      </button>
      {open && (
        <div role="menu">
          <button role="menuitem">Profile</button>
          <button role="menuitem" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </nav>
  );
}

test("menu opens via Enter key and closes via button", () => {
  render(<HeaderMenu />);
  const toggle = screen.getByRole("button", { name: /open menu/i });
  fireEvent.keyDown(toggle, { key: "Enter" });
  expect(screen.getByRole("menu")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: /close/i }));
  expect(screen.queryByRole("menu")).toBeNull();
});
