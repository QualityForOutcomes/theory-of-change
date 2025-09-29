// pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { authLogin } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const { login } = useAuth();
  const redirectTo = loc.state?.from?.pathname || "/";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);

    setError(""); 
    setLoading(true);

    try {
      const { token, user } = await authLogin({
        email: form.email.trim(),
        password: form.password,
      });
      login(token, user); // AuthProvider handles localStorage
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto" }}>
      <h1>Sign In</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input 
          name="email" 
          type="email" 
          placeholder="you@domain.com" 
          value={form.email} 
          onChange={handleChange} 
        />
        <input 
          name="password" 
          type={show ? "text" : "password"} 
          placeholder="Password" 
          value={form.password} 
          onChange={handleChange} 
        />
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
          Show password
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <p><Link to="/forgot-password">Forgot Password?</Link></p>
      </form>
    </div>
  );
}
