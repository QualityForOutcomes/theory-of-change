import api from "./api.js";

export const newsletterSubscribe = async (email) => {
  const res = await api.post("/api/newsletter/subscribe", { email });
  return res.data;
};

export const newsletterSend = async ({ subject, html }) => {
  const res = await api.post("/api/newsletter/send", { subject, html });
  return res.data;
};