"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DashboardStateError,
  getDashboardState,
  type DashboardState,
} from "@/lib/dashboard/dashboardOrchestrator";
import type { Home } from "@/lib/home/homeMapper";
import {
  getCachedCurrentHomeId,
  getCachedUserId,
} from "@/lib/sessionCache";
import { useAuthSession } from "@/lib/useAuthSession";

/** Set by createHome / setCurrentHome; next provider refresh refetches homes. */
let pendingHomesCacheInvalidation = false;

export function invalidateDashboardHomesCache(): void {
  pendingHomesCacheInvalidation = true;
}

type DashboardContextValue = {
  state: DashboardState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { userId: authUserId } = useAuthSession();
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const homesCacheRef = useRef<Home[]>([]);
  const homesLoadedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (pendingHomesCacheInvalidation) {
        homesLoadedRef.current = false;
        pendingHomesCacheInvalidation = false;
      }

      if (!homesLoadedRef.current) {
        const next = await getDashboardState();

        if (!next) {
          setState(null);
          setError("Not signed in.");
          return;
        }

        homesCacheRef.current = next.homes;
        homesLoadedRef.current = true;

        setState({
          ...next,
          homes: homesCacheRef.current,
        });
        return;
      }

      const userId = await getCachedUserId();

      if (!userId) {
        setState(null);
        setError("Not signed in.");
        return;
      }

      const currentHomeId = await getCachedCurrentHomeId(userId);
      const homes = homesCacheRef.current;
      const currentHome = homes.find((h) => h.id === currentHomeId) ?? null;

      setState({
        userId,
        homes,
        currentHomeId,
        currentHome,
      });
    } catch (err) {
      setState(null);
      setError(
        err instanceof DashboardStateError
          ? err.message
          : "Could not load dashboard."
      );
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const userId = authUserId;

    if (userId && previousUserIdRef.current !== userId) {
      homesCacheRef.current = [];
      homesLoadedRef.current = false;
      setState(null);
      setError(null);
      void refresh();
    }

    previousUserIdRef.current = userId;
  }, [authUserId, refresh]);

  return (
    <DashboardContext.Provider value={{ state, loading, error, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardState(): DashboardContextValue {
  const value = useContext(DashboardContext);

  if (!value) {
    throw new Error("useDashboardState must be used within DashboardProvider");
  }

  return value;
}
