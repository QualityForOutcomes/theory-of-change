import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout.jsx";
import ProtectedRoute from "../routes/ProtectedRoutes.jsx";
import NotFound from "../pages/NotFound.jsx";
import Dashboard from "../features/admin/AdminDashboard.jsx";
import TermsManagement from "../features/admin/TermsManagement.jsx";
import Newsletter from "../features/admin/Newsletter.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/terms" element={<TermsManagement />} />
        <Route path="/admin/newsletter" element={<Newsletter />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
