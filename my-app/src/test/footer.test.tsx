import { render, screen } from "@testing-library/react";
import React from "react";

function Footer() {
  return (
    <footer>
      <div>Quality for Outcomes</div>
      <ul aria-label="social links">
        <li>
          <a href="https://facebook.com">Facebook</a>
        </li>
        <li>
          <a href="https://linkedin.com">LinkedIn</a>
        </li>
        <li>
          <a href="https://twitter.com">Twitter</a>
        </li>
      </ul>
      <address>
        Email: info@qualityoutcomes.au Phone: +61 418 744 433 ABN: 20845959903
      </address>
    </footer>
  );
}

test("renders footer company and social links", () => {
  render(<Footer />);
  expect(screen.getByText(/quality for outcomes/i)).toBeInTheDocument();

  const social = screen.getByRole("list", { name: /social links/i });
  expect(social).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /facebook/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /linkedin/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /twitter/i })).toBeInTheDocument();
});
