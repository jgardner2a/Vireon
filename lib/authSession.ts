export type AuthSession = {
  email: string;
};

export const AUTH_CHANGED_EVENT = "vireon:auth-changed";

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { email?: unknown };
    if (typeof parsed.email !== "string" || !parsed.email.trim()) {
      return null;
    }

    return { email: parsed.email.trim() };
  } catch {
    return null;
  }
}

export function getAuthEmail(): string | null {
  return getAuthSession()?.email ?? null;
}

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAuthSession(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth", JSON.stringify({ email: email.trim() }));
  notifyAuthChanged();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth");
  notifyAuthChanged();
}
