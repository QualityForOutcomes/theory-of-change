import axios from "axios";

// Use env-driven base URL, with production fallback
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://toc-adminbackend.vercel.app",
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
      const appLogin = import.meta.env.VITE_MYAPP_LOGIN_URL || "http://localhost:3000/login";
      // Redirect to unified login page in my-app
      window.location.assign(appLogin);
    }

    return Promise.reject(
      error.response?.data?.message || error.message || "API Error"
    );
  }
);

export default api;
