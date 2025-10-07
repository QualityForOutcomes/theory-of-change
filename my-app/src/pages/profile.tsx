import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUserProfile, updateUserProfile, cancelSubscription } from "../services/api"; // Update the import path as needed
import "../style/profile.css";

type UserProfile = {
  userId: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  organisation: string;
  avatarUrl?: string | null;
  displayName: string;
  createdAt: string;
};

type Subscription = {
  plan: string;
  status: string;
  expiry: string;
  price?: string;
  activatedAt?: string;
  sessionId?: string;
};

type ProfilePageProps = {
  subscription?: Subscription;
};

const ProfilePage: React.FC<ProfilePageProps> = ({ subscription }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    organisation: "",
    username: ""
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const profileData = await fetchUserProfile();
        setUserProfile(profileData);
        // Initialize form with current data
        setEditForm({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          organisation: profileData.organisation || "",
          username: profileData.username || ""
        });
      } catch (err: any) {
        setError(err.message || "Failed to load user profile");
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const loadSubscriptionData = () => {
      try {
        // Load subscription from localStorage
        const storedSubscription = localStorage.getItem("userSubscription");
        if (storedSubscription) {
          const subscriptionData = JSON.parse(storedSubscription);
          setUserSubscription(subscriptionData);
        } else {
          // Fallback to default free plan
          setUserSubscription({
            plan: "Free Plan",
            status: "active",
            expiry: ""
          });
        }
      } catch (error) {
        console.error("Error loading subscription data:", error);
        setUserSubscription({
          plan: "Free Plan",
          status: "active",
          expiry: ""
        });
      }
    };

    loadUserProfile();
    loadSubscriptionData();
  }, []);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values when canceling
      setEditForm({
        firstName: userProfile?.firstName || "",
        lastName: userProfile?.lastName || "",
        organisation: userProfile?.organisation || "",
        username: userProfile?.username || ""
      });
    }
    setIsEditing(!isEditing);
    setError(null);
    setSuccessMessage(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setUpdateLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const updatedData = await updateUserProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        organisation: editForm.organisation,
        username: editForm.username
      });
      
      setUserProfile(updatedData);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setUpdateLoading(false);
    }
  };

  async function handleUpgrade() {
    // Redirect to local plans page instead of hitting checkout API
    if (!userProfile?.userId) {
      setCheckoutError("You need to be logged in to upgrade.");
      return;
    }
    setCheckoutError(null);
    navigate("/plans");
  }

  async function handleManageSubscription() {
    // Show confirmation dialog before canceling
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel your subscription? This action cannot be undone and you will lose access to premium features."
    );
    
    if (!confirmCancel) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      // Get user ID for cancellation
      const userId = userProfile?.userId;
      if (!userId) {
        setCheckoutError("Unable to cancel subscription: User not found");
        return;
      }

      // Get subscription ID if available
      const subscriptionId = userSubscription?.sessionId;

      // Call the cancellation API
      const result = await cancelSubscription({
        user_id: userId,
        subscription_id: subscriptionId,
      });

      if (result.success) {
        // Update local state to reflect cancellation
        setUserSubscription({
          plan: "Free Plan",
          status: "active",
          expiry: ""
        });

        // Show success message
        alert("Subscription canceled successfully. You now have access to the Free Plan.");
      } else {
        setCheckoutError("Failed to cancel subscription. Please try again.");
      }
    } catch (error: any) {
      setCheckoutError(error.message || "Failed to cancel subscription");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Left panel: user details */}
      <div className="profile-left">
        <div className="avatar">
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt="Profile Avatar" />
          ) : (
            <div className="avatar-placeholder">
              {userProfile?.firstName?.[0]?.toUpperCase() || "U"}
            </div>
          )}
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
             {successMessage}
          </div>
        )}
        
        {/* Error Message */}
        {error && !isEditing && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {!isEditing ? (
          // View Mode
          <>
            <h2 className="display-name">
              {userProfile?.displayName || "Guest User"}
            </h2>
            <p className="username">@{userProfile?.username || "username"}</p>
            <p className="email">{userProfile?.email || "Email not available"}</p>
            
            {userProfile?.organisation && (
              <p className="organization">🏢 {userProfile.organisation}</p>
            )}
            
            {userProfile?.createdAt && (
              <p className="member-since">
                📅 Member since {new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
            
            <div className="profile-actions">
              <button className="btn-edit" onClick={handleEditToggle}>
                 Edit Profile
              </button>
            </div>
          </>
        ) : (
          // Edit Mode
          <>
            <h2 className="display-name">Edit Profile</h2>
            
            <div className="edit-form">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Organisation</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.organisation}
                  onChange={(e) => handleFormChange('organisation', e.target.value)}
                  placeholder="Enter organisation"
                />
              </div>
              
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  className="btn-save-profile"
                  onClick={handleSaveChanges}
                  disabled={updateLoading}
                >
                  {updateLoading ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  className="btn-cancel"
                  onClick={handleEditToggle}
                  disabled={updateLoading}
                >
                   Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right panel: subscription details */}
      <div className="profile-right">
        <h3 className="section-title">
          💎 Subscription Details
        </h3>
        <div className="subscription-card">
          <div className="subscription-header">
            <div className="plan-info">
              <h4 className="plan-name">{userSubscription?.plan || "Free Plan"}</h4>
              <span className={`status-badge status-${userSubscription?.status?.toLowerCase() || 'inactive'}`}>
                {userSubscription?.status || "Inactive"}
              </span>
            </div>
          </div>
          
          {userSubscription?.expiry && (
            <div className="expiry-info">
              <p><strong>Valid until:</strong> {userSubscription.expiry}</p>
            </div>
          )}
          
          {userSubscription?.price && (
            <div className="price-info">
              <p><strong>Price:</strong> {userSubscription.price}</p>
            </div>
          )}
          
          {userSubscription?.activatedAt && (
            <div className="activated-info">
              <p><strong>Activated:</strong> {new Date(userSubscription.activatedAt).toLocaleDateString()}</p>
            </div>
          )}
          
          <div className="subscription-actions">
            <button className="btn-primary" onClick={handleUpgrade} disabled={checkoutLoading}>
              {checkoutLoading ? "Starting checkout..." : (userSubscription?.plan === "Free Plan" ? "Upgrade Plan" : "Change Plan")}
            </button>
            {userSubscription?.plan !== "Free Plan" && (
              <button 
                className="btn-secondary" 
                onClick={handleManageSubscription}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Canceling..." : "Cancel"}
              </button>
            )}
          </div>
          {checkoutError && (
            <div className="error-message" style={{ marginTop: 8 }}>
              ⚠️ {checkoutError}
            </div>
          )}
        </div>
        
        {/* Additional Info Section */}
        <div className="additional-info">
          <h3 className="section-title">📊 Account Overview</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">✉️</span>
              <div className="info-content">
                <span className="info-label">Email</span>
                <span className="info-value">{userProfile?.email || "N/A"}</span>
              </div>
            </div>
            
            <div className="info-item">
              <span className="info-icon">👤</span>
              <div className="info-content">
                <span className="info-label">Username</span>
                <span className="info-value">{userProfile?.username || "N/A"}</span>
              </div>
            </div>
            
            {userProfile?.organisation && (
              <div className="info-item">
                <span className="info-icon">🏢</span>
                <div className="info-content">
                  <span className="info-label">Organisation</span>
                  <span className="info-value">{userProfile.organisation}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;