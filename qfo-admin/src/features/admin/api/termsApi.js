import api from "../../../services/api";

export async function getTerms() {
  const { data } = await api.get("/api/admin/terms");
  return data;
}

export async function updateTerms(payload) {
  const { data } = await api.post("/api/admin/terms", payload);
  return data;
}

export function validateTermsContent(content) {
  if (!content || !content.trim()) {
    return { valid: false, message: "Content cannot be empty." };
  }
  const len = content.length;
  if (len < 50) {
    return { valid: false, message: "Content is too short (min 50 chars)." };
  }
  if (len > 20000) {
    return { valid: false, message: "Content is too long (max 20k chars)." };
  }
  const commonTerms = ["terms", "conditions", "privacy", "liability", "warranty", "service"];
  const hasAny = commonTerms.some((w) => content.toLowerCase().includes(w));
  if (!hasAny) {
    return { valid: false, message: "Include basic legal wording (e.g., terms, privacy)." };
  }
  return { valid: true };
}