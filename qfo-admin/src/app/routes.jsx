import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import ProtectedRoute from "../routes/ProtectedRoutes";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import Dashboard from "../features/admin/Dashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
