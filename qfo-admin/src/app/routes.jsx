import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout.jsx";
import ProtectedRoute from "../routes/ProtectedRoutes.jsx";
import NotFound from "../pages/NotFound.jsx";
import Dashboard from "../features/admin/AdminDashboard.jsx";
import TermsManagement from "../features/admin/TermsManagement.jsx";
import Login from "../pages/Login.jsx";
import TokenBootstrap from "../pages/TokenBootstrap.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      {/* Accept token via query on root and redirect into admin */}
      <Route path="/" element={<TokenBootstrap />} />
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/terms" element={<TermsManagement />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
