import React from "react";
import "../style/profile.css";

type User = {
  name: string;
  email: string;
};

type Subscription = {
  plan: string;
  status: string;
  expiry: string;
};

type ProfilePageProps = {
  user?: User;
  subscription?: Subscription;
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, subscription }) => {
  return (
    <div className="profile-container">
      {/* Left panel: user details */}
      <div className="profile-left">
        <h2>{user?.name || "Guest User"}</h2>
        <p>{user?.email || "Email not available"}</p>
      </div>

      {/* Right panel: subscription details */}
      <div className="profile-right">
        <h3>Subscription Details</h3>
        <div className="subscription-card">
          <p><strong>Plan:</strong> {subscription?.plan || "N/A"}</p>
          <p><strong>Status:</strong> {subscription?.status || "N/A"}</p>
          <p><strong>Expiry:</strong> {subscription?.expiry || "N/A"}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
