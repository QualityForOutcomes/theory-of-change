import React, { useState } from "react";
import { validateEmailDetailed, validatePassword } from "../utils/validation";
import "../style/Login.css";
import logo from "../assets/logo.png";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { authLogin } from "../services/api";
import Footer from "../components/Footer";

export default function AuthCard() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { setUser } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const redirectAfterAuth = "/";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    const emailErr = validateEmailDetailed(form.email.trim());
    if (emailErr) return emailErr;

    const passErr = validatePassword(form.password);
    if (passErr) return passErr;

    return "";
  }

  async function submitLogin() {
  try {
    const { token, user } = await authLogin({
      email: form.email.trim(),
      password: form.password,
    });

    const mappedUser = { ...user, userId: Number(user.userId) };
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(mappedUser));
    setUser(mappedUser);

    setSuccess(true); // <-- move here after API succeeds
    nav(redirectAfterAuth, { replace: true });
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || "Login failed";
    setError(msg);
    setSuccess(false);
  }
}


  async function handleSubmit(e: React.FormEvent) {
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
      await submitLogin();
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = {
        email: result.user?.email || "google-user",
        userId: 0,
        id: result.user?.uid || "google-uid",
      };
      localStorage.setItem("token", `google-${gUser.id}`);
      setUser(gUser as any);
      setError("");
      setSuccess(true);
      nav(redirectAfterAuth, { replace: true });
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError("Google sign-in failed. Please try again.");
      setSuccess(false);
    }
  };

  return (
    <div>
      <div className="login-container">
        <form onSubmit={handleSubmit} className="login-card login-mode">
          <div className="login-logo">
            <img src={logo} alt="App Logo" />
          </div>

          <h1 className="login-title">Sign In</h1>

          <label htmlFor="email" className="formRow">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@domain.com"
          />

          <label htmlFor="password" className="formRow">Password</label>
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            placeholder="********"
          />

          <div className="bottom-links">
            <div className="show-password">
              <label>
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                  aria-controls="password"
                />
                Show password
              </label>
            </div>
            <div className="forgot-password">
              <a href="/password">Forgot Password?</a>
            </div>
          </div>

          <div className="social">
            <p>or</p>
            <div className="social-buttons">
              <button type="button" className="googlebtn" onClick={handleGoogle}>
                <h3>Continue with Google</h3>
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">Logged in!</p>}
        </form>
      </div>

      <Footer />
    </div>
  );
}
