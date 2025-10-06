import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [countdown, setCountdown] = useState(3);
  
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const status = params.get("status") || "success";
  const plan = params.get("plan"); // Extract plan from URL parameters
  const price = params.get("price"); // Extract price from URL parameters

  useEffect(() => {
    // Store subscription information in localStorage
    if (status === "success" && plan) {
      const subscriptionData = {
        plan: plan,
        price: price || "",
        status: "active",
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
        sessionId: sessionId,
        activatedAt: new Date().toISOString()
      };
      
      localStorage.setItem("userSubscription", JSON.stringify(subscriptionData));
      
      // Update user data with subscription info
      const existingUser = localStorage.getItem("user");
      if (existingUser) {
        try {
          const userData = JSON.parse(existingUser);
          userData.subscription = subscriptionData;
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Error updating user data:", error);
        }
      }
    }

    // Countdown timer for redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Check if user is authenticated before redirecting to profile
          if (user) {
            navigate("/profile");
          } else {
            // If not authenticated, redirect to login with a return URL
            navigate("/login?redirect=profile&message=Please log in to view your subscription");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, plan, price, sessionId, navigate, user]);

  const handleRedirectNow = () => {
    if (user) {
      navigate("/profile");
    } else {
      navigate("/login?redirect=profile&message=Please log in to view your subscription");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card login-mode">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, color: "#10B981", marginBottom: 16 }}>✅</div>
          <h1 className="login-title">
            {status === "success" ? "Payment Successful!" : "Payment Status"}
          </h1>
        </div>
        
        <p style={{ textAlign: "center", marginBottom: 16, color: "#666" }}>
          {status === "success"
            ? `Thank you! Your ${plan || "subscription"} plan has been activated successfully.`
            : "We are processing your subscription. You can manage it from your profile."}
        </p>

        {plan && price && status === "success" && (
          <div style={{ 
            textAlign: "center", 
            marginBottom: 20, 
            padding: 16, 
            backgroundColor: "#F0FDF4", 
            borderRadius: 8,
            border: "1px solid #BBF7D0"
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: "#059669" }}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - {price}
            </p>
          </div>
        )}

        {sessionId && (
          <p style={{ textAlign: "center", color: "#777", fontSize: 12, marginBottom: 16 }}>
            Session: {sessionId}
          </p>
        )}

        <div style={{ 
          textAlign: "center", 
          marginBottom: 20,
          padding: 16,
          backgroundColor: "#EFF6FF",
          borderRadius: 8,
          border: "1px solid #BFDBFE"
        }}>
          <p style={{ margin: 0, color: "#1D4ED8", fontWeight: 500 }}>
            {user 
              ? `Redirecting to your profile in ${countdown} seconds...`
              : `Redirecting to login in ${countdown} seconds...`
            }
          </p>
          {!user && (
            <p style={{ margin: "8px 0 0 0", color: "#6B7280", fontSize: 14 }}>
              Please log in to view your subscription details
            </p>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button 
            onClick={handleRedirectNow}
            style={{
              backgroundColor: "#8750fd",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              marginRight: 12
            }}
          >
            {user ? "Go to Profile Now" : "Login to View Subscription"}
          </button>
          <a href="/project" style={{ color: "#007bff", textDecoration: "underline" }}>
            Back to Workspace
          </a>
        </div>
      </div>
    </div>
  );
}