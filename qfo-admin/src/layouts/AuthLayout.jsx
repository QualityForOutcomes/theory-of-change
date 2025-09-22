import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--bg-grad)",
      }}
    >
      <Outlet />
    </div>
  );
}
