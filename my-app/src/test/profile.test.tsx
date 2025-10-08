import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import ProfilePage from "../pages/profile";
import { fetchUserProfile, updateUserProfile, cancelSubscription } from "../services/api";

jest.mock("../services/api");
const mockFetchUserProfile = fetchUserProfile as jest.MockedFunction<typeof fetchUserProfile>;
const mockUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockCancelSubscription = cancelSubscription as jest.MockedFunction<typeof cancelSubscription>;

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockNavigate = jest.fn();

describe("ProfilePage Component", () => {
  const mockUserProfile = {
    userId: 123,
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    organisation: "Test Org",
    avatarUrl: null,
    displayName: "Test User",
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.confirm = jest.fn();
    window.alert = jest.fn();
  });

  describe("Initial Loading", () => {
    test("displays loading spinner while fetching profile", () => {
      mockFetchUserProfile.mockImplementation(() => new Promise(() => {}));
      
      render(<ProfilePage />);
      
      expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();
      const spinner = document.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
    });

    test("displays user profile data after successful fetch", async () => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });
      
      expect(screen.getByText("@testuser")).toBeInTheDocument();
      
      // Email appears twice (profile-left and account overview)
      const emailElements = screen.getAllByText("test@example.com");
      expect(emailElements.length).toBeGreaterThan(0);
      
      // Organization also appears twice
      const orgElements = screen.getAllByText(/Test Org/i);
      expect(orgElements.length).toBeGreaterThan(0);
    });

    test("displays error state when fetch fails", async () => {
      mockFetchUserProfile.mockRejectedValue(new Error("Network error"));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    test("displays member since date correctly", async () => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/member since/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/January 1, 2024/i)).toBeInTheDocument();
    });

    test("shows avatar placeholder when no avatar URL", async () => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText("T")).toBeInTheDocument();
      });
    });

    test("shows avatar image when URL is provided", async () => {
      const profileWithAvatar = {
        ...mockUserProfile,
        avatarUrl: "https://example.com/avatar.jpg",
      };
      mockFetchUserProfile.mockResolvedValue(profileWithAvatar);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        const img = screen.getByAltText("Profile Avatar");
        expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
      });
    });
  });

  describe("Subscription Display", () => {
    beforeEach(() => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
    });

    test("displays free plan when no subscription in localStorage", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText("Free Plan")).toBeInTheDocument();
      });
    });

    test("displays subscription data from localStorage", async () => {
      const subscription = {
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
        price: "$10/month",
        activatedAt: "2024-01-01T00:00:00.000Z",
        sessionId: "session_123",
      };
      localStorage.setItem("userSubscription", JSON.stringify(subscription));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText("Pro Plan")).toBeInTheDocument();
      });
      
      expect(screen.getByText(/active/i)).toBeInTheDocument();
      expect(screen.getByText(/2025-12-31/i)).toBeInTheDocument();
      expect(screen.getByText(/\$10\/month/i)).toBeInTheDocument();
    });

    test("shows upgrade button for free plan", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /upgrade plan/i })).toBeInTheDocument();
      });
    });

    test("shows change plan button for paid plan", async () => {
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /change plan/i })).toBeInTheDocument();
      });
    });

    test("shows cancel button only for paid plans", async () => {
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test("does not show cancel button for free plan", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Edit Profile Mode", () => {
    beforeEach(() => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
    });

    test("toggles edit mode when edit button clicked", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      
      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter first name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter last name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter organisation/i)).toBeInTheDocument();
    });

    test("pre-fills form with current user data", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
      expect(screen.getByDisplayValue("User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Org")).toBeInTheDocument();
    });

    test("updates form field values when typing", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      const firstNameInput = screen.getByPlaceholderText(/enter first name/i);
      await userEvent.clear(firstNameInput);
      await userEvent.type(firstNameInput, "Updated");
      
      expect(firstNameInput).toHaveValue("Updated");
    });

    test("cancels edit mode and resets form", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      const firstNameInput = screen.getByPlaceholderText(/enter first name/i);
      await userEvent.clear(firstNameInput);
      await userEvent.type(firstNameInput, "Changed");
      
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      
      // Should exit edit mode - check that form inputs are gone
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter first name/i)).not.toBeInTheDocument();
      });
      
      // Re-enter edit mode to check if form was reset
      fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
    });
  });

  describe("Update Profile", () => {
    beforeEach(() => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
    });

    test("successfully updates profile", async () => {
      const updatedProfile = {
        ...mockUserProfile,
        firstName: "Updated",
        lastName: "Name",
      };
      mockUpdateUserProfile.mockResolvedValue(updatedProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      const firstNameInput = screen.getByPlaceholderText(/enter first name/i);
      await userEvent.clear(firstNameInput);
      await userEvent.type(firstNameInput, "Updated");
      
      const lastNameInput = screen.getByPlaceholderText(/enter last name/i);
      await userEvent.clear(lastNameInput);
      await userEvent.type(lastNameInput, "Name");
      
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      
      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          firstName: "Updated",
          lastName: "Name",
          organisation: "Test Org",
          username: "testuser",
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
    });

    test("shows loading state while updating", async () => {
      mockUpdateUserProfile.mockImplementation(() => new Promise(() => {}));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    test("displays error when update fails", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Update failed"));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });

    test("success message disappears after 3 seconds", async () => {
      jest.useFakeTimers();
      mockUpdateUserProfile.mockResolvedValue(mockUserProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText(/profile updated successfully/i)).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    test("disables buttons while updating", async () => {
      mockUpdateUserProfile.mockImplementation(() => new Promise(() => {}));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
      });
      
      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      
      fireEvent.click(saveBtn);
      
      await waitFor(() => {
        expect(saveBtn).toBeDisabled();
        expect(cancelBtn).toBeDisabled();
      });
    });
  });

  describe("Subscription Management", () => {
    beforeEach(() => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
    });

    test("navigates to plans page when upgrade clicked", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /upgrade plan/i }));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith("/plans");
    });

    test("shows error if user not logged in when upgrading", async () => {
      mockFetchUserProfile.mockResolvedValue({
        ...mockUserProfile,
        userId: undefined as any,
      });
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /upgrade plan/i }));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/you need to be logged in/i)).toBeInTheDocument();
      });
    });

    test("shows confirmation dialog when canceling subscription", async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      });
      
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("Are you sure you want to cancel")
      );
    });

    test("does not cancel if user declines confirmation", async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      });
      
      expect(mockCancelSubscription).not.toHaveBeenCalled();
    });

    test("successfully cancels subscription", async () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      mockCancelSubscription.mockResolvedValue({ 
        success: true,
        message: "Subscription canceled successfully"
      });
      
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
        sessionId: "session_123",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      });
      
      await waitFor(() => {
        expect(mockCancelSubscription).toHaveBeenCalledWith({
          user_id: 123,
          subscription_id: "session_123",
        });
      });
      
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Subscription canceled successfully")
      );
      
      await waitFor(() => {
        expect(screen.getByText("Free Plan")).toBeInTheDocument();
      });
    });

    test("shows error when cancellation fails", async () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      mockCancelSubscription.mockRejectedValue(new Error("Cancellation failed"));
      
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/cancellation failed/i)).toBeInTheDocument();
      });
    });

    test("shows loading state while canceling", async () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      mockCancelSubscription.mockImplementation(() => new Promise(() => {}));
      
      localStorage.setItem("userSubscription", JSON.stringify({
        plan: "Pro Plan",
        status: "active",
        expiry: "2025-12-31",
      }));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/canceling/i)).toBeInTheDocument();
      });
    });
  });

  describe("Account Overview Section", () => {
    beforeEach(() => {
      mockFetchUserProfile.mockResolvedValue(mockUserProfile);
    });

    test("displays account overview information", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/account overview/i)).toBeInTheDocument();
      });
      
      const emailElements = screen.getAllByText("test@example.com");
      expect(emailElements.length).toBeGreaterThan(0);
      
      const usernameElements = screen.getAllByText("testuser");
      expect(usernameElements.length).toBeGreaterThan(0);
    });

    test("shows organization in account overview", async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        const orgElements = screen.getAllByText("Test Org");
        expect(orgElements.length).toBeGreaterThan(0);
      });
    });

    test("handles missing organisation gracefully", async () => {
      mockFetchUserProfile.mockResolvedValue({
        ...mockUserProfile,
        organisation: "",
      });
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      });
      
      const profileLeftSection = screen.getByText("Test User").closest(".profile-left");
      expect(profileLeftSection).toBeInTheDocument();
    });
  });
});