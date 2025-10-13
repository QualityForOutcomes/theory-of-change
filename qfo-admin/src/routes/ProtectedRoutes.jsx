import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  useEffect(() => {
    // On initial load, support token handoff: set qfo_token from ?token=...
    const params = new URLSearchParams(location.search);
    const incomingToken = params.get("token");
    if (incomingToken) {
      localStorage.setItem("qfo_token", incomingToken);
      // Clean the URL to avoid leaking the token in the address bar
      const cleanUrl = location.pathname + location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [location.search, location.pathname, location.hash]);

  const hasToken = !!localStorage.getItem("qfo_token");
  if (!hasToken) {
    const appLogin = import.meta.env.VITE_MYAPP_LOGIN_URL || "http://localhost:3000/login";
    // Use hard redirect for external URL to unified login page
    window.location.assign(appLogin);
    return null;
  }

  return children;
}