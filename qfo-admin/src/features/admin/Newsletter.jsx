import { useState } from "react";
import { sendNewsletterCampaign } from "../../services/newsletter.api";

const styles = {
  container: { padding: 24 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 5px 16px rgba(0,0,0,0.05)",
    maxWidth: 800,
    margin: "0 auto",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 600 },
  form: { display: "grid", gap: 12, marginTop: 16 },
  label: { fontSize: 14, color: "#374151" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    minHeight: 180,
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
  },
  actions: { display: "flex", gap: 12, alignItems: "center" },
  button: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  result: { marginTop: 12, fontSize: 14 },
  success: { color: "#065f46" },
  error: { color: "#b91c1c" },
};

export default function Newsletter() {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function onSend() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await sendNewsletterCampaign({ subject, html });
      setResult(data);
    } catch (e) {
      setError(e?.message || "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Send Newsletter Campaign</h2>
        <div style={styles.form}>
          <div>
            <label style={styles.label}>Subject</label>
            <input
              style={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter newsletter subject"
            />
          </div>
          <div>
            <label style={styles.label}>HTML Content</label>
            <textarea
              style={styles.textarea}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Enter HTML content"
            />
          </div>
          <div style={styles.actions}>
            <button style={styles.button} onClick={onSend} disabled={loading || !subject || !html}>
              {loading ? "Sending..." : "Send Campaign"}
            </button>
            {error && (
              <span style={{ ...styles.result, ...styles.error }}>Error: {error}</span>
            )}
            {result && result.success && (
              <span style={{ ...styles.result, ...styles.success }}>
                Dispatched — total: {result.data?.total}, sent: {result.data?.sent}, failed: {result.data?.failed}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

