"use client";

/**
 * My Home property context hook + provider.
 *
 * MEMBERSHIP PATH: property_members.is_current is the source of truth for the
 * active home. LEGACY properties.user_id is not read here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AUTH_CHANGED_EVENT } from "@/lib/authSession";
import {
  loadPropertyContextSnapshot,
  PROPERTY_CONTEXT_CHANGED_EVENT,
  switchCurrentPropertyForUser,
  type PropertyContextSnapshot,
  type PropertyContextStatus,
} from "@/lib/property/context";
import type { Property } from "@/lib/property/types";
import { useAuthSession } from "@/lib/useAuthSession";

type PropertyContextValue = {
  status: PropertyContextStatus;
  message?: string;
  currentProperty: Property | null;
  otherProperties: Property[];
  allProperties: Property[];
  loading: boolean;
  switchingPropertyId: string | null;
  switchError: string | null;
  refresh: () => Promise<void>;
  switchCurrentProperty: (propertyId: string) => Promise<void>;
};

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyContextProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuthSession();
  const [snapshot, setSnapshot] = useState<PropertyContextSnapshot>({
    status: "idle",
    currentProperty: null,
    otherProperties: [],
    allProperties: [],
  });
  const [loading, setLoading] = useState(true);
  const [switchingPropertyId, setSwitchingPropertyId] = useState<string | null>(
    null
  );
  const [switchError, setSwitchError] = useState<string | null>(null);

  const applySnapshot = useCallback((next: PropertyContextSnapshot) => {
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      applySnapshot({
        status: "error",
        message: "Not signed in.",
        currentProperty: null,
        otherProperties: [],
        allProperties: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setSwitchError(null);

    try {
      const next = await loadPropertyContextSnapshot(userId);
      applySnapshot(next);
    } catch (error) {
      console.error("[my-home] property context refresh failed", error);
      applySnapshot({
        status: "error",
        message: "Could not load property context. Try again.",
        currentProperty: null,
        otherProperties: [],
        allProperties: [],
      });
    } finally {
      setLoading(false);
    }
  }, [applySnapshot, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => {
      void refresh();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onRefresh);
    window.addEventListener(PROPERTY_CONTEXT_CHANGED_EVENT, onRefresh);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onRefresh);
      window.removeEventListener(PROPERTY_CONTEXT_CHANGED_EVENT, onRefresh);
    };
  }, [refresh]);

  const switchCurrentProperty = useCallback(
    async (propertyId: string) => {
      if (!userId) {
        setSwitchError("Not signed in.");
        return;
      }

      setSwitchingPropertyId(propertyId);
      setSwitchError(null);

      try {
        const result = await switchCurrentPropertyForUser(userId, propertyId);
        if (!result.ok) {
          setSwitchError(result.message);
          return;
        }
        applySnapshot(result.snapshot);
      } catch (error) {
        console.error("[my-home] switch current property failed", error);
        setSwitchError("Could not switch current home. Try again.");
      } finally {
        setSwitchingPropertyId(null);
      }
    },
    [applySnapshot, userId]
  );

  const value = useMemo<PropertyContextValue>(
    () => ({
      status: snapshot.status,
      message: snapshot.message,
      currentProperty: snapshot.currentProperty,
      otherProperties: snapshot.otherProperties,
      allProperties: snapshot.allProperties,
      loading,
      switchingPropertyId,
      switchError,
      refresh,
      switchCurrentProperty,
    }),
    [
      snapshot,
      loading,
      switchingPropertyId,
      switchError,
      refresh,
      switchCurrentProperty,
    ]
  );

  return (
    <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>
  );
}

export function usePropertyContext(): PropertyContextValue {
  const ctx = useContext(PropertyContext);
  if (!ctx) {
    throw new Error(
      "usePropertyContext must be used within PropertyContextProvider"
    );
  }
  return ctx;
}
