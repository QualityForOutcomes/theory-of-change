import { useState } from "react";
import { validateEmailDetailed } from "./utils/validation";
import "./stylesheet/Login.css";
import logo from "./assets/logo.png";
import { api } from "./lib/api";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  function validateForm() {
    const emailErr = validateEmailDetailed(email.trim());
    if (emailErr) return emailErr;
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
          email: email.trim(),
        }),
      });
      setSuccess(true);
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
          Enter your email address and we'll send you a reset code.
        </p>

        <label htmlFor="email" className="formRow">Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          required
        />

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Code"}
        </button>

        {error && <p className="error">{error}</p>}
        {success && (
          <div>
            <p className="success">
              If this email exists, you will receive a reset code
            </p>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button 
                type="button" 
                className="link-button"
                onClick={() => nav("/reset-password")}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "#007bff", 
                  textDecoration: "underline", 
                  cursor: "pointer" 
                }}
              >
                I have a reset code
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
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