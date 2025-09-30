// Validates that the Footer shows company info, contact details, and social links
import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "../components/Footer";

test("renders footer company info, contact details, and social links", () => {
  render(<Footer />);

  // Company/brand area
  expect(
    screen.getByRole("heading", { name: /quality for outcomes/i, level: 4 })
  ).toBeInTheDocument();
  expect(
    screen.getByText(/©\s*2025 all rights reserved\./i)
  ).toBeInTheDocument();

  // Contact details
  const email = screen.getByRole("link", { name: /info@qualityoutcomes\.au/i });
  expect(email).toHaveAttribute("href", "mailto:info@qualityoutcomes.au");

  const phone = screen.getByRole("link", { name: /\+61 418 744 433/i });
  expect(phone).toHaveAttribute("href", "tel:+61418744433");

  expect(screen.getByText(/abn:\s*20845959903/i)).toBeInTheDocument();

  // Social links (currently using '#')
  const facebook = screen.getByRole("link", { name: /facebook/i });
  const linkedin = screen.getByRole("link", { name: /linkedin/i });
  const twitter = screen.getByRole("link", { name: /twitter/i });

  expect(facebook).toBeInTheDocument();
  expect(linkedin).toBeInTheDocument();
  expect(twitter).toBeInTheDocument();

  // Optional: assert current hrefs (you can remove these two lines if you change them later)
  expect(facebook).toHaveAttribute("href", "#");
  expect(linkedin).toHaveAttribute("href", "#");
  expect(twitter).toHaveAttribute("href", "#");
});
