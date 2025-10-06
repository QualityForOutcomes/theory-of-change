import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { authLogin, authRegister, authGoogleLogin } from "../services/api";
import { signInWithGooglePopup } from "../lib/firebase";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
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
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const { login } = useAuth();
  const redirectTo = loc.state?.from?.pathname || "/";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);

    setError("");
    setLoading(true);

    try {
      let response;
      if (mode === "register") {
        response = await authRegister({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          organisation: form.organisation,   // maps to `organization` in api.ts
          username: form.username,
          acceptTandC: form.acceptTandC,
          newsLetterSubs: form.newsLetterSubs,
        });
      } else {
        response = await authLogin({
          email: form.email.trim(),
          password: form.password,
        });
      }

      const { token, user } = response;
      login(token, user ? JSON.stringify(user) : "");
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      const errData = e?.response?.data?.error;
      if (errData && typeof errData === "object" && "message" in errData) {
        setError((errData as any).message);
      } else {
        setError(e?.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    try {
      setError("");
      setLoading(true);
      const { idToken } = await signInWithGooglePopup();
      const { token, user } = await authGoogleLogin(idToken);
      login(token, user ? JSON.stringify(user) : "");
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode("login")}
          disabled={mode === "login"}
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            backgroundColor: mode === "login" ? "#007bff" : "#fff",
            color: mode === "login" ? "#fff" : "#333",
            borderRadius: "4px",
            cursor: mode === "login" ? "default" : "pointer",
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          disabled={mode === "register"}
          style={{
            padding: "8px 16px",
            border: "1px solid #ccc",
            backgroundColor: mode === "register" ? "#007bff" : "#fff",
            color: mode === "register" ? "#fff" : "#333",
            borderRadius: "4px",
            cursor: mode === "register" ? "default" : "pointer",
          }}
        >
          Create Account
        </button>
      </div>

      <h1>{mode === "login" ? "Sign In" : "Create your account"}</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {mode === "register" && (
          <>
            <input
              name="firstName"
              placeholder="First name"
              value={form.firstName}
              onChange={handleChange}
            />
            <input
              name="lastName"
              placeholder="Last name"
              value={form.lastName}
              onChange={handleChange}
            />
          </>
        )}

        <input
          name="email"
          type="email"
          placeholder="you@domain.com"
          value={form.email}
          onChange={handleChange}
        />

        {mode === "register" && (
          <>
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
            />
            <input
              name="organisation"
              placeholder="Organisation"
              value={form.organisation}
              onChange={handleChange}
            />

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                name="acceptTandC"
                checked={form.acceptTandC}
                onChange={(e) =>
                  setForm((p) => ({ ...p, acceptTandC: e.target.checked }))
                }
              />
              I accept the Terms & Conditions
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                name="newsLetterSubs"
                checked={form.newsLetterSubs}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newsLetterSubs: e.target.checked }))
                }
              />
              Subscribe to newsletter
            </label>
          </>
        )}

        <input
          name="password"
          type={show ? "text" : "password"}
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        {mode === "register" && (
          <input
            name="confirm"
            type={show ? "text" : "password"}
            placeholder="Confirm password"
            value={form.confirm}
            onChange={handleChange}
          />
        )}

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show password
        </label>

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Sign In"
            : "Create Account"}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              color: "#333",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Continue with Google
          </button>
        )}

        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {mode === "login" && (
          <p>
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
        )}
      </form>
    </div>
  );
}
