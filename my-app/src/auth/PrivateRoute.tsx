import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />;
}
