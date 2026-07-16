import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../services/api";

export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to logout and clear state
  const clearAuth = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user_meta");
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try calling /auth/me to see if we have an active session (e.g. from active cookies or Google OAuth redirect)
        const response = await api.get("/auth/me");
        if (response.data?.success && response.data?.data?.user) {
          const userData: User = {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            role: response.data.data.user.role,
          };
          setUser(userData);
          localStorage.setItem("user_meta", JSON.stringify(userData));
        } else {
          clearAuth();
        }
      } catch (error) {
        // If /auth/me fails, try a silent token refresh as fallback
        try {
          await api.post("/auth/refresh");
          const response = await api.get("/auth/me");
          if (response.data?.success && response.data?.data?.user) {
            const userData: User = {
              id: response.data.data.user.id,
              email: response.data.data.user.email,
              role: response.data.data.user.role,
            };
            setUser(userData);
            localStorage.setItem("user_meta", JSON.stringify(userData));
          } else {
            clearAuth();
          }
        } catch (refreshError) {
          clearAuth();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for global auth-logout events dispatched by axios interceptor
    const handleGlobalLogout = () => {
      clearAuth();
    };

    window.addEventListener("auth-logout", handleGlobalLogout);
    return () => {
      window.removeEventListener("auth-logout", handleGlobalLogout);
    };
  }, [clearAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data?.success && response.data?.data?.user) {
        const userData: User = {
          id: response.data.data.user.id,
          email: response.data.data.user.email,
          role: response.data.data.user.role,
        };
        setUser(userData);
        localStorage.setItem("user_meta", JSON.stringify(userData));
      } else {
        throw new Error(response.data?.message || "התחברות נכשלה");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || "התחברות נכשלה";
      throw new Error(msg);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/register", { email, password });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "הרשמה נכשלה");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || "הרשמה נכשלה";
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error on server:", error);
    } finally {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
