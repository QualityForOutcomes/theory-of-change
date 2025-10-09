import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { updateSubscription, getStripeSubscription } from "../services/api";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const hasSyncedRef = useRef(false);
  
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const status = params.get("status") || "success";
  const plan = params.get("plan"); // Extract plan from URL parameters
  const price = params.get("price"); // Extract price from URL parameters
  const subscriptionId = params.get("subscription_id");

  useEffect(() => {
    // Store subscription information in localStorage
    if (status === "success" && plan) {
      const subscriptionData = {
        plan: plan,
        price: price || "",
        status: "active",
        subscriptionId:subscriptionId,
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

  // Sync subscription to backend service
  useEffect(() => {
    const doSync = async () => {
      if (hasSyncedRef.current) return;
      if (status !== "success" || !plan) return;
      hasSyncedRef.current = true;

      try {
        setSyncLoading(true);
        setSyncError(null);

        const email = user?.email || (() => {
          try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw)?.email || "" : "";
          } catch {
            return "";
          }
        })();

        const start = new Date();
        const renewal = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

        // If we have a checkout session ID, resolve the actual Stripe subscription details
        let resolvedSubscriptionId: string | undefined = undefined;
        try {
          if (sessionId) {
            const stripeData = await getStripeSubscription({ session_id: sessionId });
            resolvedSubscriptionId = stripeData?.subscriptionId || undefined;
          }
        } catch (e) {
          console.warn('Failed to retrieve Stripe subscription details; proceeding with fallback values:', e);
        }

        const payload = {
          subscriptionId: resolvedSubscriptionId || sessionId || `${user?.userId ?? "unknown"}-${start.getTime()}`,
          email: email,
          planId: plan || 'unknown',
          status: "active",
          startDate: start.toISOString(),
          renewalDate: renewal.toISOString(),
          expiresAt: renewal.toISOString(),
          autoRenew: true,
        };

        await updateSubscription(payload);
        setSyncSuccess(true);
      } catch (err: any) {
        setSyncError(err?.message || "Failed to update subscription");
      } finally {
        setSyncLoading(false);
      }
    };

    doSync();
  }, [status, plan, sessionId, user]);

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

        {/* Subscription sync status */}
        {status === "success" && (
          <div style={{ 
            textAlign: "center", 
            marginBottom: 20, 
            padding: 12, 
            backgroundColor: syncError ? "#FEF2F2" : syncSuccess ? "#F0FDF4" : "#FFF7ED",
            borderRadius: 8,
            border: syncError ? "1px solid #FCA5A5" : syncSuccess ? "1px solid #BBF7D0" : "1px solid #FED7AA"
          }}>
            <p style={{ margin: 0, fontSize: 14, color: syncError ? "#B91C1C" : syncSuccess ? "#065F46" : "#9A3412" }}>
              {syncLoading && "Syncing your subscription with your account..."}
              {!syncLoading && syncSuccess && "Subscription saved to your account."}
              {!syncLoading && !syncSuccess && syncError && `Sync failed: ${syncError}`}
              {!syncLoading && !syncSuccess && !syncError && "Preparing your account..."}
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