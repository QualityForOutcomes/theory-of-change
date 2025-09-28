import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./pages/App";
import ProfilePage from "./pages/profile";
import Navbar from "./components/Nav";
import Footer from "./components/Footer";
import UserListPage from "./pages/UsersList";
import ProjectCreate from "./pages/Project";
import ProjectsPage from "./pages/Project";
import AuthCard from "./components/AuthCard";
import PrivateRoute from "./auth/PrivateRoute";        
import { AuthProvider } from "./auth/AuthProvider";     

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthCard />} />

          {/* Protected */}
          <Route path="/projects/:projectId" element={<App />} />
          <Route
            path="/project"
            element={
              <PrivateRoute>
                <ProjectCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <UserListPage />
              </PrivateRoute>
            }
          />
          {/* Default protected route */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ProjectsPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
