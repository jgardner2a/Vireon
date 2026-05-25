import type { HomeDashboardMetrics } from "@/lib/dashboard/getHomeDashboardMetrics";

export type DashboardSnapshot = {
  userId: string;
  homeId: string;
  metrics: HomeDashboardMetrics;
  timestamp: number;
};

const memoryCache = new Map<string, DashboardSnapshot>();

const SESSION_PREFIX = "vireon_dashboard_snapshot_";

function mapKey(userId: string, homeId: string): string {
  return `${userId}:${homeId}`;
}

function sessionStorageKey(userId: string, homeId: string): string {
  return `${SESSION_PREFIX}${userId}_${homeId}`;
}

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // quota / private mode
  }
}

function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function normalizeSnapshotMetrics(
  metrics: HomeDashboardMetrics
): HomeDashboardMetrics {
  return {
    galleryCount: metrics.galleryCount,
    maintenanceCount: metrics.maintenanceCount,
    notesCount:
      typeof metrics.notesCount === "number" ? metrics.notesCount : 0,
  };
}

function isValidSnapshot(
  value: unknown,
  userId: string,
  homeId: string
): value is DashboardSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as DashboardSnapshot;
  return (
    snapshot.userId === userId &&
    snapshot.homeId === homeId &&
    typeof snapshot.timestamp === "number" &&
    snapshot.metrics !== null &&
    typeof snapshot.metrics === "object" &&
    typeof snapshot.metrics.galleryCount === "number" &&
    typeof snapshot.metrics.maintenanceCount === "number"
  );
}

function withNormalizedMetrics(snapshot: DashboardSnapshot): DashboardSnapshot {
  return {
    ...snapshot,
    metrics: normalizeSnapshotMetrics(snapshot.metrics),
  };
}

function clearAllSessionSnapshots(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

function clearSessionSnapshotsForUser(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const prefix = `${SESSION_PREFIX}${userId}_`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function getDashboardSnapshot(
  userId: string,
  homeId: string
): DashboardSnapshot | null {
  const key = mapKey(userId, homeId);

  const fromMemory = memoryCache.get(key);
  if (fromMemory && isValidSnapshot(fromMemory, userId, homeId)) {
    return withNormalizedMetrics(fromMemory);
  }

  const stored = readSessionStorage(sessionStorageKey(userId, homeId));
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as DashboardSnapshot;
    if (!isValidSnapshot(parsed, userId, homeId)) {
      removeSessionStorage(sessionStorageKey(userId, homeId));
      return null;
    }

    const normalized = withNormalizedMetrics(parsed);
    memoryCache.set(key, normalized);
    return normalized;
  } catch {
    removeSessionStorage(sessionStorageKey(userId, homeId));
    return null;
  }
}

export function setDashboardSnapshot(snapshot: DashboardSnapshot): void {
  const key = mapKey(snapshot.userId, snapshot.homeId);
  memoryCache.set(key, snapshot);
  writeSessionStorage(
    sessionStorageKey(snapshot.userId, snapshot.homeId),
    JSON.stringify(snapshot)
  );
}

export function invalidateDashboardSnapshot(
  userId?: string,
  homeId?: string
): void {
  if (!userId && !homeId) {
    memoryCache.clear();
    clearAllSessionSnapshots();
    return;
  }

  if (userId && homeId) {
    const key = mapKey(userId, homeId);
    memoryCache.delete(key);
    removeSessionStorage(sessionStorageKey(userId, homeId));
    return;
  }

  if (userId) {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        memoryCache.delete(key);
      }
    }
    clearSessionSnapshotsForUser(userId);
  }
}
