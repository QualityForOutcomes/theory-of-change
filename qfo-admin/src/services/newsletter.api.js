import api from "./api";

export async function sendNewsletterCampaign(payload) {
  const { data } = await api.post("/api/newsletter/SendCampaign", payload);
  if (!data?.success) throw new Error(data?.message || "Send failed");
  return data;
}