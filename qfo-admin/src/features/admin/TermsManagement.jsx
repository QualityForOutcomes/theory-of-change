import { useState, useEffect, useMemo } from "react";
import { getTerms, updateTerms, validateTermsContent } from "./api/termsApi";
import RichTextEditor from "../../components/RichTextEditor.jsx";

export default function TermsManagement() {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("rich");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Edit history removed

  useEffect(() => {
    (async () => {
      try {
        const data = await getTerms();
        setContent(data?.content || "");
      } catch (e) {
        console.error("Failed to load terms:", e);
        setError("Failed to load terms. Please try again later.");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    return { words, chars };
  }, [content]);

  const onSave = async () => {
    setError("");
    const validation = validateTermsContent(content);
    if (!validation.valid) {
      setError(validation.message || "Content invalid.");
      return;
    }
    setSaving(true);
    try {
      await updateTerms({ content });
    } catch (e) {
      console.error("Save failed:", e);
      setError("Save failed. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Terms & Conditions</h2>
      <p style={{ color: "#6b7280" }}>
        Manage your Terms & Conditions content. Use rich editor or plain text.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button
          onClick={() => setMode("rich")}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: mode === "rich" ? "#eef2ff" : "#fff" }}
        >Rich Editor</button>
        <button
          onClick={() => setMode("text")}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: mode === "text" ? "#eef2ff" : "#fff" }}
        >Plain Text</button>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {mode === "rich" ? (
        <RichTextEditor value={content} onChange={setContent} height={480} />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          placeholder="Write terms as plain text..."
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <small style={{ color: "#6b7280" }}>{stats.words} words • {stats.chars} chars</small>
        <button
          onClick={onSave}
          disabled={saving}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff" }}
        >{saving ? "Saving..." : "Save"}</button>
      </div>

      {/* Edit History section removed */}
    </div>
  );
}