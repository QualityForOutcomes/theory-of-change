import { Navigate, useLocation } from "react-router-dom";

const isAuthed = () => Boolean(localStorage.getItem("qfo_token"));

// Dev-only bypass to allow viewing the dashboard without backend auth
const devBypass = () => {
  const mode = import.meta.env.MODE;
  const flag = String(import.meta.env.VITE_DEV_BYPASS_AUTH || "").toLowerCase();
  const enabled = mode !== "production" && ["1","true","yes"].includes(flag);
  return enabled;
}

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (devBypass()) return children;
  if (!isAuthed()) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
