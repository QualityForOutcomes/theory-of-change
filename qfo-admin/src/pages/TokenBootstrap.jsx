import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function TokenBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const redirect = params.get("redirect") || "/admin";

    if (token) {
      try {
        localStorage.setItem("qfo_token", token);
        // Optional: accept qfo_user if provided
        const userStr = params.get("user");
        if (userStr) {
          try {
            const decoded = decodeURIComponent(userStr);
            localStorage.setItem("qfo_user", decoded);
          } catch {}
        }
        navigate(redirect, { replace: true });
      } catch (err) {
        console.error("Failed to set token:", err);
        navigate("/login", { replace: true });
      }
    } else {
      // No token provided; go to login
      navigate("/login", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      Initializing session…
    </div>
  );
}