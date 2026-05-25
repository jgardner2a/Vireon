type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export type StorageListCacheIntent = "summary" | "gallery";

const memoryCache = new Map<string, CacheEntry<unknown>>();

function cacheKey(
  userId: string,
  homeId: string,
  intent: StorageListCacheIntent
): string {
  return `uploads:${userId}:${homeId}:${intent}`;
}

function sessionStorageKey(
  userId: string,
  homeId: string,
  intent: StorageListCacheIntent
): string {
  return `vireon_storage_cache_${userId}_${homeId}_${intent}`;
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

/** Cached storage.list result per intent (summary vs gallery list limits). */
export async function getCachedStorageList<T>(
  userId: string,
  homeId: string,
  intent: StorageListCacheIntent,
  listFn: () => Promise<T>
): Promise<T> {
  const key = cacheKey(userId, homeId, intent);

  const fromMemory = memoryCache.get(key);
  if (fromMemory) {
    return fromMemory.data as T;
  }

  const stored = readSessionStorage(sessionStorageKey(userId, homeId, intent));
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CacheEntry<T>;
      memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
      return parsed.data;
    } catch {
      removeSessionStorage(sessionStorageKey(userId, homeId, intent));
    }
  }

  const result = await listFn();
  const entry: CacheEntry<T> = { data: result, timestamp: Date.now() };
  memoryCache.set(key, entry);
  writeSessionStorage(
    sessionStorageKey(userId, homeId, intent),
    JSON.stringify(entry)
  );
  return result;
}

/** Clear cached lists for both summary and gallery after uploads or deletes. */
export function invalidateStorageCache(
  userId: string,
  homeId: string
): void {
  for (const intent of ["summary", "gallery"] as const) {
    memoryCache.delete(cacheKey(userId, homeId, intent));
    removeSessionStorage(sessionStorageKey(userId, homeId, intent));
  }
}
