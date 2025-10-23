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

  // Startup auto-login: if token exists, hydrate user from API/localStorage
  useEffect(() => {
    const startup = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return;
      setLoading(true);
      try {
        setToken(storedToken);
        if (!user) {
          const { fetchUserProfile } = await import("../services/api");
          const profile = await fetchUserProfile();
          const hydratedUser: AuthUser = {
            ...(profile as any),
            role: (profile as any)?.user_role || (profile as any)?.userRole || (profile as any)?.role || 'user',
            userId: (profile as any)?.userId ?? (profile as any)?.id ?? (Date.now() % 100000),
          };
          setUser(hydratedUser);
          localStorage.setItem("user", JSON.stringify(hydratedUser));
          localStorage.setItem("userId", String(hydratedUser.userId));
        }
      } catch (e) {
        // Clear invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    startup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string, skipRedirect = false) => {
    setLoading(true);
    try {
      const { authLogin } = await import("../services/api");
      const { token, user } = await authLogin({ email, password });
      
      // Backend provides role as 'userRole' field, map it to 'role'
      const userWithRole: AuthUser = {
        ...user,
        role: (user.user_role || user.userRole || user.role || 'user') as UserRole, // Handle user_role, userRole, or role
        userId: (user.userId ?? user.id ?? (Date.now() % 100000)) // keep string if provided; fallback to number
      };
      
      setToken(token);
      setUser(userWithRole);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userWithRole));
      localStorage.setItem("userId", String(userWithRole.userId));

      // Attempt to hydrate role from profile for accuracy (if backend provides it)
      try {
        const { fetchUserProfile } = await import("../services/api");
        const profile = await fetchUserProfile();
        const hydratedRole = (profile as any)?.user_role || (profile as any)?.userRole || (profile as any)?.role;
        if (hydratedRole && hydratedRole !== userWithRole.role) {
          const updatedUser = { ...userWithRole, role: hydratedRole as UserRole };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch {
        // Silent: profile may be unavailable or offline; keep existing role
      }
      
      // Handle role-based redirect unless explicitly skipped
      if (!skipRedirect) {
        // Defer navigation to next tick to avoid race with state updates
        setTimeout(() => handleRoleBasedRedirect(userWithRole, navigate), 0);
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
