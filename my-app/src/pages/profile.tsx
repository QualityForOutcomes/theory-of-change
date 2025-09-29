import React, { useState, useEffect } from "react";
import { fetchUserProfile, updateUserProfile } from "../services/api"; // Update the import path as needed
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
};

type ProfilePageProps = {
  subscription?: Subscription;
};

const ProfilePage: React.FC<ProfilePageProps> = ({ subscription }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    username: ""
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          organization: profileData.organisation || "",
          username: profileData.username || ""
        });
      } catch (err: any) {
        setError(err.message || "Failed to load user profile");
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values when canceling
      setEditForm({
        firstName: userProfile?.firstName || "",
        lastName: userProfile?.lastName || "",
        organization: userProfile?.organisation || "",
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
        organization: editForm.organization,
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
            ✅ {successMessage}
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
                <label className="form-label">Organization</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.organization}
                  onChange={(e) => handleFormChange('organization', e.target.value)}
                  placeholder="Enter organization"
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
              <h4 className="plan-name">{subscription?.plan || "Free Plan"}</h4>
              <span className={`status-badge status-${subscription?.status?.toLowerCase() || 'inactive'}`}>
                {subscription?.status || "Inactive"}
              </span>
            </div>
          </div>
          
          {subscription?.expiry && (
            <div className="expiry-info">
              <p><strong>Valid until:</strong> {subscription.expiry}</p>
            </div>
          )}
          
          <div className="subscription-actions">
            <button className="btn-primary">Upgrade Plan</button>
            <button className="btn-secondary">Manage Subscription</button>
          </div>
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
                  <span className="info-label">Organization</span>
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