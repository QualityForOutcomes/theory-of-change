import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider"; // assuming you have this
import "../style/Nav.css";
import logo from "../assets/logo.png";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth(); // `user` is null if not logged in

  return (
    <nav className="navbar">
      {/* Left: Logo + Company Name */}
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <h1 className="navbar-title">Quality for Outcomes</h1>
      </div>

      {/* Right: Hamburger menu only visible if user is logged in */}
      {user && (
        <div className="navbar-right">
          <div
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className={`menu-content ${menuOpen ? "visible" : ""}`}>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/logout" onClick={() => setMenuOpen(false)}>Logout</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
