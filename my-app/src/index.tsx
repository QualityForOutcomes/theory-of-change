import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import { AuthProvider } from "../src/auth/lib/authContext";
import PrivateRoute from "./auth/PrivateRoute";
import AuthCard from "./auth/components/AuthCard";
import App from './pages/App';
import ProfilePage from "./pages/profile";
import Navbar from './components/Nav';
import Footer from './components/Footer';
import UserListPage from "./pages/UsersList";
import ProjectCreate from "../src/pages/Project";
import ProjectsPage from "../src/pages/Project";
import Login from "./pages/Login";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
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
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<App />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/project" element={<ProjectCreate />} />
          </Route>
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
