"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  fetchAuthSession,
  getAuthEmail,
  getAuthUserId,
  initAuthSessionListener,
} from "./authSession";

let sharedSessionFetch: Promise<void> | null = null;

function ensureAuthSessionLoaded(): Promise<void> {
  if (!sharedSessionFetch) {
    sharedSessionFetch = fetchAuthSession()
      .then(() => undefined)
      .finally(() => {
        sharedSessionFetch = null;
      });
  }
  return sharedSessionFetch;
}

/** Client auth session state from Supabase Auth. */
export function useAuthSession() {
  const [email, setEmail] = useState<string | null>(() =>
    typeof window !== "undefined" ? getAuthEmail() : null
  );
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== "undefined" ? getAuthUserId() : null
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setEmail(getAuthEmail());
    setUserId(getAuthUserId());
  }, []);

  useEffect(() => {
    initAuthSessionListener();
    setIsLoading(true);

    void ensureAuthSessionLoaded().finally(() => {
      refresh();
      setIsLoading(false);
    });

    const onSync = () => refresh();

    window.addEventListener(AUTH_CHANGED_EVENT, onSync);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onSync);
    };
  }, [refresh]);

  return {
    email,
    userId,
    isAuthenticated: !!userId,
    isLoading,
  };
}
