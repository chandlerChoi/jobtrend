import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  googleLogin: () => Promise<{ error: string | null }>;
  kakaoLogin: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  userId: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_ID_KEY = "jobtrend_user_id";

function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) localStorage.setItem(GUEST_ID_KEY, data.session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) localStorage.setItem(GUEST_ID_KEY, session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    return { error: error?.message ?? null };
  }

  async function kakaoLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // 로그인 유저는 Supabase UUID, 비로그인은 localStorage UUID
  const userId = user?.id ?? getGuestId();

  return (
    <AuthContext.Provider value={{ user, session, loading, googleLogin, kakaoLogin, signOut, userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
