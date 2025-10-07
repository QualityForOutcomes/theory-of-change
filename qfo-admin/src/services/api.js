import axios from "axios";

// In development, use relative baseURL so Vite dev proxy (`/api` -> backend) applies.
// In production builds, VITE_API_URL can point to the deployed backend.
const baseURL = (import.meta.env.MODE !== "production")
  ? "/"
  : (import.meta.env.VITE_API_URL ?? "/");

const api = axios.create({
  baseURL,
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

    // Reject the full error object so callers (e.g., fetchDashboard)
    // can detect true network errors via `!error.response` and avoid
    // incorrectly falling back to demo data on backend HTTP errors.
    return Promise.reject(error);
  }
);

export default api;
