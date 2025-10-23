import axios from "axios";

// Use env-driven base URL, with production fallback
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
      try { localStorage.removeItem("qfo_token"); } catch {}
      const appLogin = import.meta.env.VITE_MYAPP_LOGIN_URL;
      if (appLogin) {
        // Redirect to my-app logout so it clears its own localStorage
        let target = appLogin;
        try {
          const u = new URL(appLogin);
          u.pathname = "/logout";
          u.search = "";
          target = u.toString();
        } catch {
          target = appLogin.replace(/login(?:\/?$)/, "logout");
        }
        window.location.assign(target);
      } else {
        console.error("VITE_MYAPP_LOGIN_URL is not configured");
      }
    }

    return Promise.reject(
      error.response?.data?.message || error.message || "API Error"
    );
  }
);

export default api;
