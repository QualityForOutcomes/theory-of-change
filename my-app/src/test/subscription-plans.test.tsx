import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SubscriptionPlans from "../pages/SubscriptionPlans";
import { createCheckoutSession } from "../services/api";

jest.mock("../services/api");
const mockCreateCheckoutSession = createCheckoutSession as jest.MockedFunction<typeof createCheckoutSession>;

function setUser(userId: number = 123, email: string = "user@example.com") {
  localStorage.setItem("user", JSON.stringify({ userId, email }));
}

function setSubscription(planId: "free" | "pro" | "premium") {
  const planName = planId === "free" ? "Free Plan" : planId === "pro" ? "Pro Plan" : "Premium Plan";
  localStorage.setItem(
    "userSubscription",
    JSON.stringify({ plan: planName, status: "active", activatedAt: new Date().toISOString() })
  );
}

describe("SubscriptionPlans page logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("requires login: shows error when subscribing while logged out", async () => {
    render(<SubscriptionPlans />);

    // Click Subscribe on Pro
    const subscribeButtons = screen.getAllByRole("button", { name: /subscribe/i });
    const proBtn = subscribeButtons.find(btn => btn.parentElement?.parentElement?.className.includes("pro"));
    expect(proBtn).toBeTruthy();
    fireEvent.click(proBtn!);

    await waitFor(() => {
      expect(screen.getByText(/you must be logged in to subscribe/i)).toBeInTheDocument();
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  test("Free user: marks Free as current, offers Pro & Premium", async () => {
    setUser();
    setSubscription("free");
    render(<SubscriptionPlans />);

    // Expect a current plan indicator within Free card
    const currentIndicators = screen.getAllByText(/your current plan/i);
    expect(currentIndicators.length).toBeGreaterThan(0);

    // Ensure Pro & Premium have Subscribe buttons enabled
    const subscribeButtons = screen.getAllByRole("button", { name: /subscribe/i });
    expect(subscribeButtons.length).toBeGreaterThanOrEqual(2);
  });

  test("Pro user: marks Pro as current and prevents reselecting Pro", async () => {
    setUser();
    setSubscription("pro");
    render(<SubscriptionPlans />);

    // Expect Pro card heading exists
    const proHeader = screen.getByRole("heading", { name: /^pro$/i });
    expect(proHeader).toBeInTheDocument();

    // Expect an indicator somewhere noting current plan (desired behavior)
    // This will fail until the page reads localStorage to mark current plan dynamically
    const currentIndicators = screen.getAllByText(/your current plan/i);
    expect(currentIndicators.length).toBeGreaterThan(0);

    // Attempt to subscribe to Pro should NOT call checkout
    const subscribeButtons = screen.getAllByRole("button", { name: /subscribe/i });
    const proBtn = subscribeButtons.find(btn => btn.parentElement?.parentElement?.className.includes("pro"));
    expect(proBtn).toBeTruthy();
    fireEvent.click(proBtn!);

    await waitFor(() => {
      // Expected: show a friendly message preventing duplicate subscription
      // This assertion describes intended UX; implement logic to set an error like below
      expect(screen.getByText(/already on this plan/i)).toBeInTheDocument();
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  test("Premium user: marks Premium as current and prevents reselecting Premium", async () => {
    setUser();
    setSubscription("premium");
    render(<SubscriptionPlans />);

    const premiumHeader = screen.getByRole("heading", { name: /^premium$/i });
    expect(premiumHeader).toBeInTheDocument();

    const currentIndicators = screen.getAllByText(/your current plan/i);
    expect(currentIndicators.length).toBeGreaterThan(0);

    const subscribeButtons = screen.getAllByRole("button", { name: /subscribe/i });
    const premiumBtn = subscribeButtons.find(btn => btn.parentElement?.parentElement?.className.includes("premium"));
    expect(premiumBtn).toBeTruthy();
    fireEvent.click(premiumBtn!);

    await waitFor(() => {
      expect(screen.getByText(/already on this plan/i)).toBeInTheDocument();
    });
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  test("Free user can start Pro checkout and is redirected to Stripe", async () => {
    setUser(321, "test321@example.com");
    setSubscription("free");
    mockCreateCheckoutSession.mockResolvedValue({ url: "https://stripe.example/checkout/session" } as any);

    // Mock window.location.href mutation without ts-ignore by defining getter/setter
    const originalLocation = window.location;
    let redirectedTo = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return redirectedTo;
        },
        set href(url: string) {
          redirectedTo = url;
        },
      } as any,
    });

    render(<SubscriptionPlans />);

    const subscribeButtons = screen.getAllByRole("button", { name: /subscribe/i });
    const proBtn = subscribeButtons.find(btn => btn.parentElement?.parentElement?.className.includes("pro"));
    expect(proBtn).toBeTruthy();
    fireEvent.click(proBtn!);

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalled();
      expect((window.location as any).href).toContain("stripe.example/checkout/session");
    });

    // Restore window.location
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
});