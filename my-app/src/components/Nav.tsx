import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "../style/Nav.css";
import logo from "../assets/logo.png";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <nav className="navbar">
      {/* Left: Logo + Company Name */}
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <h1 className="navbar-title">Quality for Outcomes</h1>
      </div>

      {/* Right: Hamburger menu only visible if user is logged in */}
      {user && (
        <div className="navbar-right" ref={menuRef}>
          <div
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className={`menu-content ${menuOpen ? "visible" : ""}`}>
            <Link to="/project" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/logout" onClick={() => setMenuOpen(false)}>Logout</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;