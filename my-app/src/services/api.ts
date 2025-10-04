import axios from "axios";

// const API_BASE = "https://toc-user-backend.vercel.app";
const API_BASE ="https://nodejs-serverless-function-express-rho-ashen.vercel.app";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Authentication APIs
export const authRegister = async (payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organisation: string;     // map to organization if backend expects that spelling
  username: string;
  acceptTandC: boolean;
  newsLetterSubs: boolean;
}) => {
  try {
    // Step 1: Create user account
    const res = await axios.post(
      `${API_BASE}/api/user/Create`,
      {
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        organization: payload.organisation,   // <-- if backend uses "organisation" keep same
        username: payload.username,
        acceptTandC: payload.acceptTandC,
        newsLetterSubs: payload.newsLetterSubs,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const { success, message } = res.data ?? {};
    if (!success) throw new Error(message || "Registration failed");

    // Step 2: Immediately login to get token
    const loginRes = await axios.post(
      `${API_BASE}/api/auth/Login`,
      { email: payload.email, password: payload.password },
      { headers: { "Content-Type": "application/json" } }
    );

    const { success: loginOk, data, message: loginMsg } = loginRes.data ?? {};
    if (!loginOk) throw new Error(loginMsg || "Auto-login failed after registration");

    return { token: data.token, user: data.user };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Registration failed");
  }
};

export const authLogin = async (payload: { email: string; password: string }) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/auth/Login`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const { success, data, message } = response.data;

    if (!success) throw new Error(message || "Login failed");

    return { token: data.token, user: data.user };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Login failed");
  }
};

// Google login using Firebase ID token
export const authGoogleLogin = async (idToken: string) => {
  try {
    const res = await axios.post(
      `${API_BASE}/api/auth/google`,
      { idToken },
      { headers: { "Content-Type": "application/json" } }
    );

    const { success, data, message } = res.data ?? {};
    if (success === false) throw new Error(message || "Google login failed");

    const pack = data ?? res.data; // supports {success,data:{user,token}} or {user,token}
    if (!pack?.token || !pack?.user) throw new Error("Invalid Google login response");

    return { token: pack.token, user: pack.user };
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || err.message || "Google login failed");
  }
};

// User Profile API
export const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/user/Get`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    const { success, data, message } = response.data;

    if (!success) throw new Error(message || "Failed to fetch user profile");

    return data; // Returns the user profile data
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to fetch user profile");
  }
};

export const updateUserProfile = async (payload: {
  firstName?: string;
  lastName?: string;
  organization?: string;
  username?: string;
}) => {
  try {
    const response = await axios.put(`${API_BASE}/api/user/Update`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    const { success, data, message } = response.data;

    if (!success) throw new Error(message || "Failed to update user profile");

    return data; // Returns the updated user profile data
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to update user profile");
  }
};
// TOC Project APIs

export const createTocProject = async (data: {
  userId: string;
  projectTitle: string;
  status: "draft" | "published";
}) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/project/Create`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      }
    );
    return response.data; // { success, message, data, statusCode }
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to create project");
  }
};

export const updateToc = async (payload: any) => {
  const token = localStorage.getItem("token"); // get the stored token
  if (!token) throw new Error("No authentication token found");

  try {
    const response = await axios.put(
      `${API_BASE}/api/project/Update`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data; // { success, message, data, statusCode }
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to update project");
  }
};


export const fetchUserTocs = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/project/GetProjectList`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(), // token identifies the user
      },
    });
    return response.data; // { success, data, message }
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to fetch projects");
  }
};


export const fetchTocProjectById = async (projectId: string) => {
  if (!projectId) throw new Error("Project ID is required");

  try {
    const response = await axios.get(`${API_BASE}/api/project/Get`, {
      params: { projectId },
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    // response.data should contain your saved tocData and tocColor
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || "Failed to fetch project");
  }
};
