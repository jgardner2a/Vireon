"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getAuthEmail } from "./authSession";

/** Client auth session state for UI (read-only; actions use existing auth helpers). */
export function useAuthSession() {
  const [email, setEmail] = useState<string | null>(() =>
    typeof window !== "undefined" ? getAuthEmail() : null
  );

  const refresh = useCallback(() => {
    setEmail(getAuthEmail());
  }, []);

  useEffect(() => {
    refresh();

    const onSync = () => refresh();

    window.addEventListener(AUTH_CHANGED_EVENT, onSync);
    window.addEventListener("storage", onSync);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  return {
    email,
    isAuthenticated: !!email,
  };
}
