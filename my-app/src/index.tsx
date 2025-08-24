import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import App from './pages/App';
import ProfilePage from "./pages/profile";
import Navbar from './components/Nav';
import Footer from './components/Footer';
import UserListPage from "./pages/UsersList";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UserListPage />} />
      </Routes>
      <Footer />
    </Router>
  </React.StrictMode>
);
