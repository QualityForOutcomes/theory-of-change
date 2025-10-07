import { Outlet, Link, useNavigate } from "react-router-dom";

const styles = {
  page: { minHeight: "100vh", padding: 24, background: "var(--bg-grad)" },
  shell: {
    maxWidth: 1120,
    margin: "0 auto",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
    borderRadius: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    border: "1px solid rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    background: "rgba(255,255,255,0.75)",
    borderBottom: "1px solid #e5e7eb",
  },
  logo: {
    height: 40,
    width: 40,
    borderRadius: 9999,
    display: "grid",
    placeItems: "center",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 700,
  },
  brandSm: { margin: 0, fontSize: 12, color: "#6b7280" },
  brandTitle: { margin: 0, fontSize: 18, fontWeight: 600 },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    padding: "12px 24px",
    background: "rgba(255,255,255,0.75)",
    borderTop: "1px solid #e5e7eb",
  },
};

export default function AdminLayout() {
  const nav = useNavigate();
  const logout = () => {
    localStorage.removeItem("qfo_token");
    nav("/login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={styles.logo}>Q</div>
            <div>
              <p style={styles.brandSm}>Quality for Outcomes</p>
              <h1 style={styles.brandTitle}>Admin Dashboard</h1>
            </div>
          </Link>
          <button
            onClick={logout}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 14,
            }}
          >
            Logout
          </button>
        </header>
        <nav style={{ padding: "0 24px", borderBottom: "1px solid #e5e7eb", background: "rgba(255,255,255,0.75)" }}>
          <ul style={{ display: "flex", gap: 16, listStyle: "none", margin: 0, padding: 12 }}>
            <li>
              <Link to="/admin" style={{ textDecoration: "none", color: "#374151" }}>Dashboard</Link>
            </li>
            <li>
              <Link to="/admin/terms" style={{ textDecoration: "none", color: "#374151" }}>Terms & Conditions</Link>
            </li>
          </ul>
        </nav>
        <main>
          <Outlet />
        </main>
        <footer style={styles.footer}>
          © {new Date().getFullYear()} Quality for Outcomes — Admin
        </footer>
      </div>
    </div>
  );
}
