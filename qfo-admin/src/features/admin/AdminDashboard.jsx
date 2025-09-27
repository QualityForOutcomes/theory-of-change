import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { Users, CreditCard, TrendingUp, Settings } from "lucide-react";

// --- Mock data ---
const trafficSeries = [
  { label: "Today", value: 1280 },
  { label: "Monthly", value: 32140 },
  { label: "Quarterly", value: 91520 },
];
const revenueSeries = [
  { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 1398 },
  { month: "Mar", revenue: 9800 },
  { month: "Apr", revenue: 3908 },
  { month: "May", revenue: 4800 },
  { month: "Jun", revenue: 8200 },
];
const subscriptions = [
  { id: "SUB-0012", user: "Olivia Rhye", tier: "Premium", period: "Monthly", amount: 29, status: "Active" },
  { id: "SUB-0013", user: "James Doe", tier: "Standard", period: "Quarterly", amount: 59, status: "Past Due" },
  { id: "SUB-0014", user: "Ava Smith", tier: "Premium", period: "Annual", amount: 299, status: "Active" },
  { id: "SUB-0015", user: "Liam Patel", tier: "Standard", period: "Monthly", amount: 19, status: "Cancelled" },
];

// local styles for cards/sections (no page shell here)
const S = {
  section: { padding: 24 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(1, minmax(0,1fr))", gap: 24 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(1, minmax(0,1fr))", gap: 24 },
  gridTable: { display: "grid", gridTemplateColumns: "1fr", gap: 24 },
  card: { background: "rgba(255,255,255,0.9)", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  header: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  avatar: { height: 48, width: 48, borderRadius: 9999, objectFit: "cover" },
  kpiGrid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
  kpiBox: { borderRadius: 12, background: "#f9fafb", padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 12, color: "#6b7280", margin: 0 },
  kpiValue: { fontSize: 14, fontWeight: 600, margin: 0 },
  kpiRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  pillRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 },
  th: { textAlign: "left", color: "#6b7280", padding: "8px 12px" },
  td: { padding: "8px 12px", borderTop: "1px solid #f3f4f6" },
};

export default function Dashboard() {
  return (
    <div style={S.section}>
      {/* Overview row */}
      <section style={S.grid3}>
        <Card title="Overview" subtitle="Admin name and details">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img style={S.avatar} src="https://i.pravatar.cc/80" alt="Admin" />
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Divyam Juneja</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                Super Admin · divyam@qfo.org
              </p>
            </div>
          </div>
        </Card>

        <Card title="Traffic" subtitle="Rolling 6 months">
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Premium Customers" subtitle="Active">
          <div style={S.pillRow}>
            <Stat title="Total" value="1,284" icon={<Users size={16} />} />
            <Stat title="New" value="+128" muted />
            <Stat title="Churn" value="-24" muted />
          </div>
        </Card>
      </section>

      {/* KPI row */}
      <section style={S.grid4}>
        <Card title="Traffic" subtitle="Today / Monthly / Quarterly">
          <div style={S.kpiGrid3}>
            {trafficSeries.map((t) => (
              <div key={t.label} style={S.kpiBox}>
                <p style={S.kpiLabel}>{t.label}</p>
                <p style={S.kpiValue}>{t.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Revenue" subtitle="MTD">
          <div style={S.kpiRow}>
            <div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>$82,400</p>
              <p style={{ margin: 0, fontSize: 12, color: "#059669" }}>+12.4% vs last month</p>
            </div>
            <TrendingUp size={28} color="#059669" />
          </div>
        </Card>

        <Card title="Update Payment" subtitle="Payout account">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f3ff", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} color="#7c3aed" />
              <p style={{ margin: 0, fontSize: 14 }}>Stripe · **** 4242</p>
            </div>
            <button
              style={{
                border: "none", borderRadius: 8, background: "#7c3aed",
                color: "#fff", padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Update
            </button>
          </div>
        </Card>

        <Card title="User Profiles & Settings" subtitle="Manage accounts">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
              <Settings size={18} />
              <span style={{ fontSize: 14 }}>Open Console</span>
            </div>
            <button style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "white", padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Go
            </button>
          </div>
        </Card>
      </section>

      {/* Subscriptions table + chart */}
      <section style={S.gridTable}>
        <Card title="Subscriptions" subtitle="Recent signups & renewals">
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>User</th>
                  <th style={S.th}>Tier</th>
                  <th style={S.th}>Period</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 ? "#f9fafb" : "white" }}>
                    <td style={{ ...S.td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12 }}>{s.id}</td>
                    <td style={S.td}>{s.user}</td>
                    <td style={S.td}>{s.tier}</td>
                    <td style={S.td}>{s.period}</td>
                    <td style={S.td}>${s.amount}</td>
                    <td style={S.td}><StatusPill status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Revenue Trend" subtitle="Last 6 months">
          <div style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}

/* Helpers */
function Card({ title, subtitle, children }) {
  return (
    <div style={S.card}>
      <div style={S.header}>
        <h3 style={S.title}>{title}</h3>
        {subtitle && <p style={S.subtitle}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ title, value, icon, muted }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 90,
        borderRadius: 12,
        background: muted ? "#f9fafb" : "#f5f3ff",
        padding: 12,
        textAlign: "center",
      }}
    >
      <div style={{ margin: "0 auto 4px", height: 24, width: 24, color: "#4b5563" }}>
        {icon ?? <Users size={18} />}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{title}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    Active: ["#ecfdf5", "#065f46", "#a7f3d0"],
    "Past Due": ["#fffbeb", "#92400e", "#fde68a"],
    Cancelled: ["#fef2f2", "#991b1b", "#fecaca"],
  };
  const [bg, color, ring] = map[status] || ["#f3f4f6", "#374151", "#e5e7eb"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 9999,
        padding: "4px 8px",
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
        boxShadow: `inset 0 0 0 1px ${ring}`,
      }}
    >
      {status}
    </span>
  );
}
