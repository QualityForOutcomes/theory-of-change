import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import App from './pages/App';
import ProfilePage from "./pages/profile";
import Navbar from './components/Nav';
import Footer from './components/Footer';
import UserListPage from "./pages/UsersList";
import ProjectCreate from "./pages/Project";
import ProjectsPage from "./pages/Project";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<App />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UserListPage />} />
        <Route path="/project" element={<ProjectCreate />} />
      </Routes>
      <Footer />
    </Router>
  </React.StrictMode>
);
