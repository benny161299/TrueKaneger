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
  firstName?: string;
  lastName?: string;
  phone?: string;
  machzor?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  isApproved?: boolean;
  isProfileComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    machzor: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUserData = (raw: any): User => ({
  id: raw.id || raw._id,
  email: raw.email,
  role: raw.role,
  firstName: raw.firstName,
  lastName: raw.lastName,
  phone: raw.phone,
  machzor: raw.machzor,
  approvalStatus: raw.role === "admin" ? "approved" : (raw.approvalStatus || (raw.isApproved ? "approved" : "pending")),
  isApproved: raw.role === "admin" ? true : !!raw.isApproved,
  isProfileComplete: raw.isProfileComplete !== undefined
    ? raw.isProfileComplete
    : Boolean(raw.firstName && raw.lastName && raw.phone && raw.machzor),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to logout and clear state
  const clearAuth = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user_meta");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data?.success && response.data?.data?.user) {
        const userData = mapUserData(response.data.data.user);
        setUser(userData);
        localStorage.setItem("user_meta", JSON.stringify(userData));
      }
    } catch {
      // silent fail on background refresh
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try calling /auth/me to see if we have an active session (e.g. from active cookies or Google OAuth redirect)
        const response = await api.get("/auth/me");
        if (response.data?.success && response.data?.data?.user) {
          const userData = mapUserData(response.data.data.user);
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
            const userData = mapUserData(response.data.data.user);
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
        if (response.data.data.accessToken) {
          localStorage.setItem("access_token", response.data.data.accessToken);
        }
        if (response.data.data.refreshToken) {
          localStorage.setItem("refresh_token", response.data.data.refreshToken);
        }
        const userData = mapUserData(response.data.data.user);
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

  const completeProfile = async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    machzor: string;
  }) => {
    try {
      const response = await api.post("/auth/complete-profile", data);
      if (response.data?.success && response.data?.data?.user) {
        const userData = mapUserData(response.data.data.user);
        setUser(userData);
        localStorage.setItem("user_meta", JSON.stringify(userData));
      } else {
        throw new Error(response.data?.message || "עדכון הפרטים נכשל");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || "עדכון הפרטים נכשל";
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        completeProfile,
        refreshUser,
      }}
    >
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
