import { useState } from "react";
import { validatePassword } from "./utils/validation";
import "./stylesheet/Login.css";
import logo from "./assets/logo.png";
import { api } from "./lib/api";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [form, setForm] = useState({
    token: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    if (!form.token.trim()) return "Please enter your reset code.";
    
    const passErr = validatePassword(form.newPassword);
    if (passErr) return passErr;

    if (form.confirmPassword !== form.newPassword) return "Passwords do not match.";
    
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setError(err);
      setSuccess(false);
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await api("/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({
          token: form.token.trim(),
          newPassword: form.newPassword,
        }),
      });
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        nav("/login");
      }, 2000);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-card login-mode">
        <div className="login-logo">
          <img src={logo} alt="App Logo" />
        </div>

        <h1 className="login-title">Reset Password</h1>
        <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
          Enter your reset code and new password.
        </p>

        <label htmlFor="token" className="formRow">Reset Code</label>
        <input
          id="token"
          name="token"
          type="text"
          value={form.token}
          onChange={handleChange}
          placeholder="Enter your 8-character reset code"
          maxLength="8"
          style={{ textTransform: "uppercase" }}
          required
        />

        <label htmlFor="newPassword" className="formRow">New Password</label>
        <input
          id="newPassword"
          name="newPassword"
          className="pw-input"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder="********"
          required
        />

        <label htmlFor="confirmPassword" className="formRow">Confirm New Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={show ? "text" : "password"}
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter new password"
          required
        />

        <div className="show-password" style={{ marginBottom: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              aria-controls="newPassword confirmPassword"
            />
            Show passwords
          </label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        {error && <p className="error">{error}</p>}
        {success && (
          <p className="success">
            Password reset successful! Redirecting to login...
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button 
            type="button" 
            className="link-button"
            onClick={() => nav("/forgot-password")}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#007bff", 
              textDecoration: "underline", 
              cursor: "pointer",
              marginRight: "20px"
            }}
          >
            Request New Code
          </button>
          <button 
            type="button" 
            className="link-button"
            onClick={() => nav("/login")}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#007bff", 
              textDecoration: "underline", 
              cursor: "pointer" 
            }}
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}