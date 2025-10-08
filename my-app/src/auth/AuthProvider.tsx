import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleRoleBasedRedirect, determineUserRole, User, UserRole } from "../utils/roleRouting";

// Extended User type for AuthProvider with additional fields
type AuthUser = User & {
  userId: string | number;   // required for auth; backend may return string
  username?: string;
  firstName?: string;
  lastName?: string;
  organisation?: string;
  avatarUrl?: string | null;
  displayName?: string;
};
type Ctx = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, skipRedirect?: boolean) => Promise<void>;
  logout: () => void;
  setUser: (u: AuthUser | null) => void;
  loading: boolean;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string, skipRedirect = false) => {
    setLoading(true);
    try {
      const { authLogin } = await import("../services/api");
      const { token, user } = await authLogin({ email, password });
      
      // Backend provides role as 'userRole' field, map it to 'role'
      const userWithRole: AuthUser = {
        ...user,
        role: (user.userRole || user.role || 'user') as UserRole, // Handle both userRole and role fields
        userId: (user.userId ?? user.id ?? (Date.now() % 100000)) // keep string if provided; fallback to number
      };
      
      setToken(token);
      setUser(userWithRole);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userWithRole));
      
      // Handle role-based redirect unless explicitly skipped
      if (!skipRedirect) {
        handleRoleBasedRedirect(userWithRole, navigate);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
  };

  const value = useMemo(() => ({ user, token, isAuthenticated: !!token, login, logout, setUser, loading }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
