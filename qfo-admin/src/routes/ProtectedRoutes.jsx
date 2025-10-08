import { useLocation } from "react-router-dom";

const isAuthed = () => Boolean(localStorage.getItem("qfo_token"));

// If not authed, redirect to user app login page
const getMyAppLoginUrl = () => {
  const envUrl = (import.meta.env.VITE_USER_APP_URL || "").trim();
  const base = envUrl || (import.meta.env.DEV ? "http://localhost:3000" : "https://toc-user-frontend.vercel.app");
  return base.endsWith("/login") ? base : `${base}/login`;
};

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isAuthed()) {
    const loginUrl = getMyAppLoginUrl();
    // Use hard redirect to external domain to avoid react-router limitations
    window.location.href = loginUrl;
    return null;
  }
  return children;
}
