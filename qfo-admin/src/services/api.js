import axios from "axios";

// Use VITE_API_URL for all environments, fallback to local dev server
const api = axios.create({
  // Prefer explicit VITE_API_URL; fallback to local dev server on 4001
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4001",
  // Remove if you don’t use cookies/sessions, keep if server sets cookies
  withCredentials: false,
});

// Attach bearer token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("qfo_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle expired/invalid token
    if (error.response?.status === 401) {
      localStorage.removeItem("qfo_token");
      // Optional: redirect to login if you want automatic logout
      // window.location.href = "/login";
    }

    return Promise.reject(
      error.response?.data?.message || error.message || "API Error"
    );
  }
);

export default api;

// Newsletter API helpers
export const newsletterSubscribe = async (email) => {
  const res = await api.post('/api/newsletter/subscribe', { email });
  return res.data;
};

export const newsletterSend = async ({ subject, html }) => {
  const res = await api.post('/api/newsletter/send', { subject, html });
  return res.data;
};
