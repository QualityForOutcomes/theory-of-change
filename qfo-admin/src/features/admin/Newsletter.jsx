import { useState } from "react";
import { newsletterSend } from "../../services/api";

export default function Newsletter() {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!subject.trim() || !html.trim()) {
      setError("Subject and HTML are required");
      return;
    }
    if (!localStorage.getItem("qfo_token")) {
      setError("Login required. Please sign in.");
      return;
    }

    try {
      setLoading(true);
      const res = await newsletterSend({ subject, html });
      setResult(res?.data || { total: 0, sent: 0, failed: 0, failures: [] });
    } catch (err) {
      setError(typeof err === "string" ? err : (err?.message || "Failed to send campaign"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Newsletter Broadcast</h2>
      <p style={{ color: "#6b7280", marginTop: 4 }}>
        Send a newsletter email to all subscribed users.
      </p>

      <form onSubmit={handleSend} style={{ display: "grid", gap: 12, maxWidth: 720 }}>
        <label>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Subject</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your campaign subject"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#6b7280" }}>HTML Content</div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={10}
            placeholder="<h1>Hello subscribers!</h1>"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", fontFamily: "monospace" }}
          />
        </label>

        <button
          disabled={loading}
          style={{ border: "none", borderRadius: 8, background: "#7c3aed", color: "white", padding: "10px 16px", fontWeight: 600, cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "Sending…" : "Send Campaign"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, background: "#ecfeff", border: "1px solid #bae6fd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 600 }}>Dispatch Results</div>
          <div style={{ fontSize: 14 }}>Total: {result.total}</div>
          <div style={{ fontSize: 14 }}>Sent: {result.sent}</div>
          <div style={{ fontSize: 14 }}>Failed: {result.failed}</div>
          {result.failures?.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Failures</summary>
              <ul>
                {result.failures.map((f, i) => (
                  <li key={i} style={{ fontFamily: "monospace" }}>{f}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

