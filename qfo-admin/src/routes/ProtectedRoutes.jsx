import { Navigate, useLocation } from "react-router-dom";

const isAuthed = () => Boolean(localStorage.getItem("qfo_token"));

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
