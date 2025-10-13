import { useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // Auth is not enforced; admin is accessible without login.
  useLocation();
  return children;
}