import "./App.css";
import Login from "./LoginPage";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/authContext";

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <main style={{ padding: 24 }}>
      <h1>Welcome</h1>
      <p>Signed in as: <b>{user?.email}</b></p>
      <button onClick={logout}>Logout</button>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* default */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
