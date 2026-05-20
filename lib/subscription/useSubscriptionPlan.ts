"use client";

/**
 * CLIENT ONLY — for UI rendering. Do not import in API routes, server
 * components, `route.ts`, or data/store modules. Server logic must call
 * `getSubscriptionPlan(profileId)` directly.
 */

import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT } from "@/lib/authSession";
import { getProfileId } from "@/lib/data/profile";
import {
  getVaultAccessLevel,
  hasFullVaultAccess as evaluateFullVaultAccess,
  type VaultAccessLevel,
} from "@/lib/permissions";
import { getSubscriptionPlan, type UserPlan } from "./subscription";

export type UseSubscriptionPlanResult = {
  /** UI render cache only — not for permission/limit logic without refresh. */
  plan: UserPlan | null;
  ready: boolean;
  error: boolean;
  /** Re-fetch from STL (`getSubscriptionPlan`). */
  refresh: () => void;
  vaultAccess: VaultAccessLevel | null;
  hasFullVaultAccess: boolean;
};

/**
 * STL consumer hook: loads tier via `getSubscriptionPlan(profileId)`.
 * Caches result in React state for display; re-fetches on focus and auth change.
 */
export function useSubscriptionPlan(
  profileId: string | null
): UseSubscriptionPlanResult {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    const id = profileId?.trim() ?? "";
    if (!id) {
      setPlan(null);
      setError(false);
      setReady(true);
      return;
    }

    setReady(false);
    setError(false);
    void getSubscriptionPlan(id)
      .then((next) => {
        setPlan(next);
        setReady(true);
      })
      .catch(() => {
        setPlan(null);
        setError(true);
        setReady(true);
      });
  }, [profileId]);

  useEffect(() => {
    refresh();

    const onInvalidate = () => refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onInvalidate);
    window.addEventListener("focus", onInvalidate);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onInvalidate);
      window.removeEventListener("focus", onInvalidate);
    };
  }, [refresh]);

  const vaultAccess = plan !== null ? getVaultAccessLevel(plan) : null;

  return {
    plan,
    ready,
    error,
    refresh,
    vaultAccess,
    hasFullVaultAccess:
      plan !== null ? evaluateFullVaultAccess(plan) : false,
  };
}

/** Syncs `dataCache.profileId` for client UI — not subscription tier. */
export function useProfileId(): string | null {
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setProfileId(getProfileId());
    read();

    const onInvalidate = () => read();
    window.addEventListener(AUTH_CHANGED_EVENT, onInvalidate);
    window.addEventListener("focus", onInvalidate);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onInvalidate);
      window.removeEventListener("focus", onInvalidate);
    };
  }, []);

  return profileId;
}
