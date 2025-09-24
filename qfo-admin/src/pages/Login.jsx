import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    if (email && pass) {
      localStorage.setItem("qfo_token", "dev-token");
      nav("/admin");
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
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
