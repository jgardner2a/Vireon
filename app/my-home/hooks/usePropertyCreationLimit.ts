"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT } from "@/lib/authSession";
import {
  getCurrentUserPropertyLimitStatus,
  type PropertyLimitStatus,
} from "@/lib/propertiesStore";

/**
 * Property creation UI allowance from Supabase count + canCreateProperty.
 * Free users can create one property; at limit the UI stays visible with upgrade prompt.
 */
export function usePropertyCreationLimit() {
  const [status, setStatus] = useState<PropertyLimitStatus | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    void getCurrentUserPropertyLimitStatus().then((next) => {
      setStatus(next);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    refresh();

    const onSync = () => refresh();
    window.addEventListener("focus", onSync);
    window.addEventListener(AUTH_CHANGED_EVENT, onSync);

    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener(AUTH_CHANGED_EVENT, onSync);
    };
  }, [refresh]);

  const canCreate = status?.canAdd ?? true;
  const limitReached = ready && status !== null && !status.canAdd;

  return {
    status,
    ready,
    canCreate,
    limitReached,
    refresh,
  };
}
