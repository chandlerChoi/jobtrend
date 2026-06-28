import { createContext, useContext, useMemo } from "react";
import { getUserId } from "../api/client";

// MVP guest auth: a stable per-browser UUID, sent as x-user-id on every API
// call (see api/lib/auth.ts). Swap for real email/password + JWT later.
const AuthContext = createContext<{ userId: string } | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ userId: getUserId() }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
