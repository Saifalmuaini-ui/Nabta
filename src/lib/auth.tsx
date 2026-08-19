"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "./supabase/client";

export type Role = "user" | "government" | "admin";

export interface CloudProfile {
  id: string;
  name: string | null;
  area: string | null;
  emirate: string | null;
  role: Role;
  locale: "en" | "ar";
}

interface AuthValue {
  /** False when no Supabase project is attached; the app stays offline-only. */
  enabled: boolean;
  ready: boolean;
  user: User | null;
  session: Session | null;
  profile: CloudProfile | null;
  role: Role;
  /** Government console. Admin is a superset, so it passes too. */
  isGovernment: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = supabaseBrowser();
  const [ready, setReady] = useState(!supabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CloudProfile | null>(null);

  const user = session?.user ?? null;

  const loadProfile = useCallback(
    async (id: string | undefined) => {
      if (!supabase || !id) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, name, area, emirate, role, locale")
        .eq("id", id)
        .maybeSingle();
      setProfile((data as CloudProfile) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      void loadProfile(data.session?.user.id).finally(() => setReady(true));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return error?.message ?? null;
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return error?.message ?? null;
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(
    () => loadProfile(user?.id),
    [loadProfile, user?.id],
  );

  const role: Role = profile?.role ?? "user";

  const value = useMemo<AuthValue>(
    () => ({
      enabled: supabaseConfigured,
      ready,
      user,
      session,
      profile,
      role,
      isGovernment: role === "government" || role === "admin",
      isAdmin: role === "admin",
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [ready, user, session, profile, role, signIn, signUp, signInWithGoogle, signOut, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
