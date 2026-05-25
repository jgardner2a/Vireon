import type { Session } from "@supabase/supabase-js";

import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import { clearSessionCache } from "./sessionCache";
import { supabase } from "./supabaseClient";

export type AuthSession = {
  userId: string;
  email: string;
};

export const AUTH_CHANGED_EVENT = "vireon:auth-changed";

let cachedSession: Session | null = null;
let listenerInitialized = false;

function sessionToAuth(session: Session | null): AuthSession | null {
  const userId = session?.user?.id?.trim() ?? "";
  const email = session?.user?.email?.trim() ?? "";
  if (!userId) return null;
  return { userId, email };
}

function applySessionMirror(session: Session | null): void {
  cachedSession = session;
}

export function initAuthSessionListener(): void {
  if (typeof window === "undefined" || listenerInitialized) return;
  listenerInitialized = true;

  try {
    localStorage.removeItem("auth");
    localStorage.removeItem("vireonAuthAccounts");
  } catch {
    // ignore
  }

  void supabase.auth.getSession().then(({ data: { session } }) => {
    applySessionMirror(session);
    notifyAuthChanged();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    applySessionMirror(session);
    notifyAuthChanged();
  });
}

/** Synchronous read of the in-memory Supabase session cache. */
export function getAuthSession(): AuthSession | null {
  return sessionToAuth(cachedSession);
}

/** UI display only — not for tenant logic or storage keys. */
export function getAuthEmail(): string | null {
  return getAuthSession()?.email ?? null;
}

/** Tenant id from session.user.id only. */
export function getAuthUserId(): string | null {
  return cachedSession?.user?.id?.trim() ?? null;
}

/** Loads the current Supabase Auth session from the client. */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[auth] getSession", error);
    return null;
  }

  applySessionMirror(session);
  return sessionToAuth(session);
}

export function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export async function clearAuthSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] signOut", error);
  }
  applySessionMirror(null);
  clearSessionCache();
  invalidateDashboardSnapshot();
  notifyAuthChanged();
}
