import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const validateToken = async () => {
    const token = localStorage.getItem("token");
    console.log("AuthContext: Token from localStorage:", token ? "exists" : "not found");
    if (!token) { 
      console.log("AuthContext: No token found, setting loading to false");
      setLoading(false); 
      return; 
    }
    try {
      console.log("AuthContext: Making /auth/me request...");
      const res = await api("/auth/me");
      console.log("AuthContext: /auth/me success:", res);
      setUser(res.user);
    } catch (error) {
      console.error("AuthContext: /auth/me failed:", error);
      console.error("AuthContext: Error details:", error.message);
      // Only remove token if it's actually invalid, not for network errors
      if (error.message === "Invalid token" || error.message === "Unauthorized") {
        console.log("AuthContext: Removing invalid token");
        localStorage.removeItem("token");
        setUser(null);
      } else {
        console.log("AuthContext: Network error, keeping token for retry");
        // For network errors, we'll keep the token but set user to null temporarily
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateToken();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const login = (userData) => {
    console.log("AuthContext: Setting user data:", userData);
    setUser(userData);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser: login, logout, loading, validateToken }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
