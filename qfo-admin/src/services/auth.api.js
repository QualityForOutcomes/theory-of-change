import axios from "axios";

// Prefer a dedicated user service URL when provided; otherwise fall back.
const baseURL = import.meta.env.VITE_USER_SERVICE_URL
  ?? import.meta.env.VITE_API_URL
  ?? "/";

const authApi = axios.create({
  baseURL,
  withCredentials: false,
});

// Perform login against the user service. Expected response shape:
// { success: boolean, message?: string, data?: { token: string, user?: any } }
export async function loginUser({ email, password }) {
  try {
    const res = await authApi.post("/api/auth/login", { email, password }, {
      headers: { "Content-Type": "application/json" },
    });

    const { success, data, message } = res.data || {};
    if (!success) throw new Error(message || "Login failed");
    const token = data?.token;
    const user = data?.user;
    if (!token) throw new Error("Missing token in response");
    return { token, user };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Login failed";
    throw new Error(msg);
  }
}

// Optional: verify current token; resolves to user or throws on 401.
export async function verifyToken() {
  try {
    const token = localStorage.getItem("qfo_token");
    if (!token) throw new Error("No token");
    const res = await authApi.get("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = res.data?.data?.user || res.data?.user;
    return user;
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Verification failed";
    throw new Error(msg);
  }
}

export default authApi;