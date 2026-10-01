import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, request, tokenStore } from "@/shared/api/client";
import type { AuthResponse, AuthUser } from "@/shared/api/types";

type AuthContextValue = {
  user: AuthUser | null;
  /** False until a stored session has been validated. */
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Queries whose answer depends on who is signed in; refetched whenever that changes. */
const PERSONAL_QUERIES = new Set(["votes", "prediction-fixtures", "prediction-leaderboard"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(() => !tokenStore.get());
  const queryClient = useQueryClient();
  const refreshPersonal = useCallback(
    () => void queryClient.invalidateQueries({ predicate: (q) => PERSONAL_QUERIES.has(String(q.queryKey[0])) }),
    [queryClient],
  );

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    request<AuthUser>("/auth/me")
      .then((me) => !cancelled && setUser(me))
      .catch((err) => {
        // Only a rejected token ends the session; a network blip shouldn't log the user out.
        if (err instanceof ApiError && err.status === 401) tokenStore.set(null);
      })
      .finally(() => !cancelled && setIsReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = useCallback(async (path: string, email: string, password: string) => {
    const res = await request<AuthResponse>(path, { method: "POST", body: { email, password } });
    tokenStore.set(res.token);
    setUser(res.user);
    refreshPersonal();
  }, [refreshPersonal]);

  const login = useCallback((email: string, password: string) => authenticate("/auth/login", email, password), [authenticate]);
  const register = useCallback((email: string, password: string) => authenticate("/auth/register", email, password), [authenticate]);
  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    refreshPersonal();
  }, [refreshPersonal]);

  const value = useMemo(() => ({ user, isReady, login, register, logout }), [user, isReady, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
