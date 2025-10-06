import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authLogin, authRegister } from "../services/api"; // adjust if needed

// Define what a user looks like
export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  org?: string;
} | null;

type AuthContextType = {
  user: User;
  setUser: (u: User) => void;
  logout: () => void;
  loading: boolean;
};

const AuthCtx = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // 👇 If you have an /auth/me API
        const res = await fetch("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem("token");
        }
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
