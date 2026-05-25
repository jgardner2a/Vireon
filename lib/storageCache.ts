type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function cacheKey(userId: string, homeId: string): string {
  return `uploads:${userId}:${homeId}`;
}

function sessionStorageKey(userId: string, homeId: string): string {
  return `vireon_storage_cache_${userId}_${homeId}`;
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

/** Cached storage.list result for uploads:{userId}:{homeId}. */
export async function getCachedStorageList<T>(
  userId: string,
  homeId: string,
  listFn: () => Promise<T>
): Promise<T> {
  const key = cacheKey(userId, homeId);

  const fromMemory = memoryCache.get(key);
  if (fromMemory) {
    return fromMemory.data as T;
  }

  const stored = readSessionStorage(sessionStorageKey(userId, homeId));
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CacheEntry<T>;
      memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
      return parsed.data;
    } catch {
      removeSessionStorage(sessionStorageKey(userId, homeId));
    }
  }

  const result = await listFn();
  const entry: CacheEntry<T> = { data: result, timestamp: Date.now() };
  memoryCache.set(key, entry);
  writeSessionStorage(
    sessionStorageKey(userId, homeId),
    JSON.stringify(entry)
  );
  return result;
}

/** Clear cached list after uploads or deletes for a home folder. */
export function invalidateStorageCache(
  userId: string,
  homeId: string
): void {
  memoryCache.delete(cacheKey(userId, homeId));
  removeSessionStorage(sessionStorageKey(userId, homeId));
}
