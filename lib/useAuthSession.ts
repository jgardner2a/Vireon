"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  fetchAuthSession,
  getAuthEmail,
  getAuthUserId,
  initAuthSessionListener,
} from "./authSession";

/** Client auth session state from Supabase Auth. */
export function useAuthSession() {
  const [email, setEmail] = useState<string | null>(() =>
    typeof window !== "undefined" ? getAuthEmail() : null
  );
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== "undefined" ? getAuthUserId() : null
  );

  const refresh = useCallback(() => {
    setEmail(getAuthEmail());
    setUserId(getAuthUserId());
  }, []);

  useEffect(() => {
    initAuthSessionListener();
    void fetchAuthSession().then(() => refresh());

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
  };
}
