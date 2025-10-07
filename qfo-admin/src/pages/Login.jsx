import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../services/auth.api";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state && loc.state.from && loc.state.from.pathname) ? loc.state.from.pathname : "/admin";
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || !pass) {
      return setError("Please enter email and password");
    }
    setError("");
    setLoading(true);
    try {
      const { token } = await loginUser({ email: email.trim(), password: pass });
      localStorage.setItem("qfo_token", token);
      nav(redirectTo, { replace: true });
    } catch (err) {
      const msg = err?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: 420,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(6px)",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}>
        <div
          style={{
            height: 48,
            width: 48,
            borderRadius: 9999,
            display: "grid",
            placeItems: "center",
            background: "#7c3aed",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Q
        </div>
      </div>

      <h2 style={{ textAlign: "center", margin: "8px 0 16px", fontSize: 20 }}>
        Sign In
      </h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 14 }}>
          Email Address
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            style={{
              width: "100%",
              marginTop: 4,
              border: "1px solid #e5e7eb",
              padding: 10,
              borderRadius: 12,
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Password
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              border: "1px solid #e5e7eb",
              padding: 10,
              borderRadius: 12,
              fontSize: 14,
            }}
          />
        </label>
        <div style={{ textAlign: "right" }}>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              textDecoration: "underline",
              fontSize: 14,
            }}
          >
            Forgot Password?
          </button>
        </div>
        {error && (
          <div style={{ color: "crimson", fontSize: 14 }}>{error}</div>
        )}
        <button
          type="submit"
          style={{
            border: "none",
            background: "#7c3aed",
            color: "#fff",
            padding: "10px 0",
            borderRadius: 12,
            fontWeight: 600,
          }}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
