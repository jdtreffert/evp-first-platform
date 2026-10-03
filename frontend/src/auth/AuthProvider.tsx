import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { AuthUser } from "./authContext";
import { API_BASE, postJson } from "../api/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!response.ok && response.status !== 401) {
          throw new Error(`Unable to check sign-in status (${response.status})`);
        }
        if (!active) return;
        if (response.status === 401) {
          setUser(null);
          setError(null);
        } else {
          const body = await response.json() as { user: AuthUser };
          if (!active) return;
          setUser(body.user);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        setUser(null);
        setError(err instanceof Error ? err.message : "Unable to check sign-in status");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const requestLoginCode = useCallback(async (email: string) => {
    await postJson("/auth/login", { email });
  }, []);

  const requestPatientRegistration = useCallback(async (email: string, inviteCode: string) => {
    await postJson("/auth/register", { email, inviteCode });
  }, []);

  const requestAdminBootstrap = useCallback(async (email: string, secret: string) => {
    await postJson("/auth/bootstrap", { email, secret });
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const result = await postJson<{ user: AuthUser }>("/auth/verify", { email, code });
    setUser(result.user);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await postJson<void>("/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      requestLoginCode,
      requestPatientRegistration,
      requestAdminBootstrap,
      verifyCode,
      logout,
    }),
    [user, loading, error, requestLoginCode, requestPatientRegistration, requestAdminBootstrap, verifyCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
