import React, { useState, useEffect } from "react";
import { validateEmailDetailed, validatePassword } from "../utils/validation";
import "../style/Login.css";
import logo from "../assets/logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { authLogin, authRegister, authGoogleLogin } from "../services/api";
import { signInWithGooglePopup } from "../lib/firebase";
import Footer from "../components/Footer";

type Mode = "login" | "register";

export default function AuthCard() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organisation: "",
    username: "",
    password: "",
    confirm: "",
    acceptTandC: false,
    newsLetterSubs: false,
  });

  const { setUser } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfterAuth = searchParams.get("redirect") ? `/${searchParams.get("redirect")}` : "/";
  const urlMessage = searchParams.get("message");

  const [errors, setErrors] = useState<{ email: string; password: string; confirm: string }>({
    email: "",
    password: "",
    confirm: "",
  });
  const [touched, setTouched] = useState<{ email: boolean; password: boolean; confirm: boolean }>({
    email: false,
    password: false,
    confirm: false,
  });
  
  // Set error message from URL params on component mount
  useEffect(() => {
    if (urlMessage) {
      setError(urlMessage);
    }
  }, [urlMessage]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      if (!form.username.trim()) return "Please choose a username.";
      if (!form.acceptTandC) return "You must accept the Terms & Conditions.";
      if (form.confirm !== form.password) return "Passwords do not match.";
    }
    return "";
  }

  async function submitRegister() {
    const { email, password, firstName, lastName, organisation, username, acceptTandC, newsLetterSubs } = form;
    const { token, user } = await authRegister({
      email: email.trim(),
      password,
      firstName,
      lastName,
      organisation,
      username,
      acceptTandC,
      newsLetterSubs,
    });

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user as any);
  }

  async function submitLogin() {
    const { token, user } = await authLogin({
      email: form.email.trim(),
      password: form.password,
    });

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user as any);
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
      if (mode === "register") {
        await submitRegister();
      } else {
        await submitLogin();
      }
      setSuccess(true);
      nav(redirectAfterAuth, { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Something went wrong. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setShow(false);
    setError("");
    setSuccess(false);
    setForm((f) => ({
      ...f,
      password: "",
      confirm: "",
      firstName: next === "register" ? f.firstName : "",
      lastName: next === "register" ? f.lastName : "",
      organisation: next === "register" ? f.organisation : "",
      username: next === "register" ? f.username : "",
      acceptTandC: next === "register" ? f.acceptTandC : false,
      newsLetterSubs: next === "register" ? f.newsLetterSubs : false,
    }));
  }

  async function handleGoogle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const { idToken } = await signInWithGooglePopup();
      const { token, user } = await authGoogleLogin(idToken);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user as any);

      setSuccess(true);
      nav(redirectAfterAuth, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="login-container">
        <form
          onSubmit={handleSubmit}
          className={`login-card ${mode === "login" ? "login-mode" : "register-mode"}`}
        >
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

          <h1 className="login-title">{mode === "login" ? "Sign In" : "Create your account"}</h1>

          {mode === "register" && (
            <>
              <label htmlFor="firstName" className="formRow">First Name</label>
              <input id="firstName" name="firstName" type="text" value={form.firstName} onChange={handleChange} placeholder="Your First name" />
              <label htmlFor="lastName" className="formRow">Last Name</label>
              <input id="lastName" name="lastName" type="text" value={form.lastName} onChange={handleChange} placeholder="Your Last name" />
            </>
          )}

          <label htmlFor="email" className="formRow">Email Address</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="you@domain.com" />

          {mode === "register" && (
            <>
              <label htmlFor="organisation" className="formRow">Organisation</label>
              <input id="organisation" name="organisation" type="text" value={form.organisation} onChange={handleChange} placeholder="Quality for Outcomes" />

              <label htmlFor="username" className="formRow">Username</label>
              <input id="username" name="username" type="text" value={form.username} onChange={handleChange} placeholder="Choose a username" />
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

          {mode === "register" && (
            <>
              <label htmlFor="confirm" className="formRow">Confirm Password</label>
              <input id="confirm" name="confirm" type={show ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="Re-enter password" />
            </>
          )}

          <div className="bottom-links">
            {mode === "login" && (
              <div className="forgot-password">
                <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
              </div>
            )}

            <div className="show-password">
              <label>
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} aria-controls="password" />
                Show password
              </label>
            </div>
          </div>

          {mode === "login" && (
            <div className="social">
              <p>or</p>
              <div className="social-buttons">
                <button type="button" className="googlebtn" onClick={handleGoogle} disabled={loading}>
                  <h3>Continue with Google</h3>
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (mode === "login" ? "Signing in..." : "Creating...") : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {mode === "register" && (
            <>
              {/* Terms & Conditions with hyperlink */}
              <label className="terms" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  name="acceptTandC"
                  checked={form.acceptTandC}
                  onChange={(e) => setForm((p) => ({ ...p, acceptTandC: e.target.checked }))}
                  required
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                <span style={{ lineHeight: "1.4" }}>
                  I accept the{" "}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: "#3498db",
                      textDecoration: "underline",
                      fontWeight: "500",
                      transition: "color 0.2s ease"
                    }}
                    onMouseEnter={(e) => (e.target as HTMLAnchorElement).style.color = "#2980b9"}
                    onMouseLeave={(e) => (e.target as HTMLAnchorElement).style.color = "#3498db"}
                  >
                    Terms &amp; Conditions
                  </a>
                  {" "}and acknowledge that I have read and understood them.
                </span>
              </label>

              {/* Newsletter checkbox */}
              <label className="terms" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="newsLetterSubs"
                  checked={form.newsLetterSubs}
                  onChange={(e) => setForm((p) => ({ ...p, newsLetterSubs: e.target.checked }))}
                />
                Subscribe to our newsletter
              </label>
            </>
          )}


          {error && <p className="error">{error}</p>}
          {success && <p className="success">{mode === "login" ? "Logged in!" : "Account created!"}</p>}
        </form>
      </div>

      <Footer />
    </div>
  );
}
