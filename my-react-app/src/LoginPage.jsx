import { useState } from "react";
import { validateEmailDetailed, validatePassword } from "./utils/validation";
import "./stylesheet/Login.css";
import logo from "./assets/logo.png";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { api } from "./lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./lib/authContext";

export default function AuthCard() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organisation: "",
    password: "",
    confirm: "",
  });

  const [show, setShow] = useState(false);
  const [error, setError] = useState("");     // error text
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const { setUser: setAuthUser } = useAuth(); 

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    const emailErr = validateEmailDetailed(form.email.trim());
    if (emailErr) return emailErr;

    const passErr = validatePassword(form.password);
    if (passErr) return passErr;

    if (mode === "register") {
      if (!form.firstName.trim()) return "Please enter your First name.";
      if (!form.lastName.trim()) return "Please enter your Last name.";
      if (!form.organisation.trim()) return "Please enter your Organisation name.";
      if (form.confirm !== form.password) return "Passwords do not match.";
    }
    return "";
  }

  async function submitRegister() {
    const { token, user } = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        org: form.organisation,
      }),
    });
    localStorage.setItem("token", token);
    setAuthUser(user);
    nav("/dashboard", { replace: true });     
  }

  async function submitLogin() {
    const { token, user } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
      }),
    });
    localStorage.setItem("token", token);
    setAuthUser(user);                          
    nav("/dashboard", { replace: true });    
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
      if (mode === "register") {
        await submitRegister();
      } else {
        await submitLogin();
      }
      setSuccess(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setShow(false);
    setError("");
    setSuccess(false);
    setForm(f => ({
      ...f,
      password: "",
      confirm: "",
      firstName: next === "register" ? f.firstName : "",
      lastName: next === "register" ? f.lastName : "",
      organisation: next === "register" ? f.organisation : "",
    }));
  }

  const handleGoogle = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setAuthUser({ email: result.user?.email || "google-user", id: result.user?.uid });
      setError("");
      setSuccess(true);
      nav("/dashboard", { replace: true });     // <-- redirect
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError("Google sign-in failed. Please try again.");
      setSuccess(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className={`login-card ${mode === "login" ? "login-mode" : "register-mode"}`}>
        <div className="login-logo">
          <img src={logo} alt="App Logo" />
        </div>

        {/* Toggle */}
        <div className="auth-toggle" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
            role="tab"
            aria-selected={mode === "login"}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => switchMode("register")}
            role="tab"
            aria-selected={mode === "register"}
          >
            Create Account
          </button>
        </div>

        <h1 className="login-title">
          {mode === "login" ? "Sign In" : "Create your account"}
        </h1>

        {mode === "register" && (
          <>
            <label htmlFor="firstName" className="formRow">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Your First name"
            />
            <label htmlFor="lastName" className="formRow">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Your Last name"
            />
          </>
        )}

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

        {mode === "register" && (
          <>
            <label htmlFor="organisation" className="formRow">Organisation</label>
            <input
              id="organisation"
              name="organisation"
              type="text"
              value={form.organisation}
              onChange={handleChange}
              placeholder="Quality for Outcomes"
            />
          </>
        )}

        <label htmlFor="password" className="formRow">Password</label>
        <input
          id="password"
          name="password"
          className="pw-input"
          type={show ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={form.password}
          onChange={handleChange}
          placeholder="********"
        />

        <div className="bottom-links">
          {mode === "login" && (
            <>
              <div className="forgot-password">
                <a href="/password" className="forgot-password">Forgot Password?</a>
              </div>
            </>
          )}

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
        </div>

        {mode === "register" && (
          <>
            <label htmlFor="confirm" className="formRow">Confirm Password</label>
            <input
              id="confirm"
              name="confirm"
              type={show ? "text" : "password"}
              value={form.confirm}
              onChange={handleChange}
              placeholder="Re-enter password"
            />
          </>
        )}

        {mode === "register" && (
          <>
            <div>
              <label className="terms">
                <input type="checkbox" name="terms" required />
                By continuing, you agree to Quality for Outcomes{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </a>
              </label>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <div>
              <label className="terms">
                <input type="checkbox" name="newsletter" />
                Subscribe to our newsletter{" "}
              </label>
            </div>
          </>
        )}

        {mode === "login" && (
          <>
            <div className="social">
              <p>or</p>
              <div className="social-buttons">
                <button type="button" className="googlebtn" onClick={handleGoogle}>
                  <img src="../src/assets/google.png" alt="Google logo" />
                  <h3>Continue with Google</h3>
                </button>
              </div>
            </div>
          </>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (mode === "login" ? "Signing in..." : "Creating...") : (mode === "login" ? "Sign In" : "Create Account")}
        </button>

        {error && <p className="error">{error}</p>}
        {success && (
          <p className="success">
            {mode === "login" ? "Logged in!" : "Account created!"}
          </p>
        )}
      </form>
    </div>
  );
}
