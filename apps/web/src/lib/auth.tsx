import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthUser } from "@ksb/types";
import { authApi } from "@/api/endpoints";
import { setAccessToken } from "@/api/client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    const { user: loggedIn, accessToken } =
      await authApi.login({ email, password });

    setAccessToken(accessToken);
    setUser(loggedIn);
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ) => {
    const { user: created, accessToken } =
      await authApi.register({
        name,
        email,
        password,
      });

    setAccessToken(accessToken);
    setUser(created);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
}