import { supabase } from "@/lib/supabaseClient";

export const GALLERY_SIGNED_URL_TTL_SECONDS = 60;

export type SignedUrlCacheEntry = {
  path: string;
  signedUrl: string;
  expiresAt: number;
};

const memoryByScope = new Map<string, Map<string, SignedUrlCacheEntry>>();

function scopeKey(userId: string, homeId: string): string {
  return `gallery_signed:${userId}:${homeId}`;
}

function sessionStorageKey(userId: string, homeId: string): string {
  return `gallery_signed_${userId}_${homeId}`;
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

function getScopeMap(userId: string, homeId: string): Map<string, SignedUrlCacheEntry> {
  const key = scopeKey(userId, homeId);
  let map = memoryByScope.get(key);
  if (!map) {
    map = hydrateScopeFromSession(userId, homeId) ?? new Map();
    memoryByScope.set(key, map);
  }
  return map;
}

function hydrateScopeFromSession(
  userId: string,
  homeId: string
): Map<string, SignedUrlCacheEntry> | null {
  const stored = readSessionStorage(sessionStorageKey(userId, homeId));
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as SignedUrlCacheEntry[];
    const map = new Map<string, SignedUrlCacheEntry>();
    const now = Date.now();

    for (const entry of parsed) {
      if (entry.path && entry.signedUrl && entry.expiresAt > now) {
        map.set(entry.path, entry);
      }
    }

    return map;
  } catch {
    removeSessionStorage(sessionStorageKey(userId, homeId));
    return null;
  }
}

function persistScope(userId: string, homeId: string, map: Map<string, SignedUrlCacheEntry>): void {
  const now = Date.now();
  const entries = [...map.values()].filter((entry) => entry.expiresAt > now);
  writeSessionStorage(sessionStorageKey(userId, homeId), JSON.stringify(entries));
}

function pruneExpired(map: Map<string, SignedUrlCacheEntry>): void {
  const now = Date.now();
  for (const [path, entry] of map) {
    if (entry.expiresAt <= now) {
      map.delete(path);
    }
  }
}

export function getValidCachedSignedUrl(
  userId: string,
  homeId: string,
  path: string
): string | null {
  const map = getScopeMap(userId, homeId);
  const entry = map.get(path);
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    map.delete(path);
    persistScope(userId, homeId, map);
    return null;
  }
  return entry.signedUrl;
}

function storeSignedUrls(
  userId: string,
  homeId: string,
  rows: { path: string; signedUrl: string }[]
): void {
  const map = getScopeMap(userId, homeId);
  const expiresAt = Date.now() + GALLERY_SIGNED_URL_TTL_SECONDS * 1000;

  for (const row of rows) {
    map.set(row.path, {
      path: row.path,
      signedUrl: row.signedUrl,
      expiresAt,
    });
  }

  persistScope(userId, homeId, map);
}

/** Invalidate signed URLs for a user+home scope (upload, home change). */
export function invalidateSignedUrlCache(userId: string, homeId: string): void {
  memoryByScope.delete(scopeKey(userId, homeId));
  removeSessionStorage(sessionStorageKey(userId, homeId));
}

/** Clear all signed URL scopes for a user (identity change). */
export function invalidateSignedUrlCacheForUser(userId: string): void {
  const prefix = `gallery_signed:${userId}:`;
  for (const key of [...memoryByScope.keys()]) {
    if (key.startsWith(prefix)) {
      memoryByScope.delete(key);
    }
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`gallery_signed_${userId}_`)) {
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

export function fileNameFromStoragePath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/**
 * Returns signed URLs for paths, reusing cache until expiry.
 * Only calls createSignedUrls for uncached or expired paths.
 */
export async function resolveSignedGalleryUrls(
  userId: string,
  homeId: string,
  paths: string[],
  bucket: string
): Promise<{ name: string; url: string }[]> {
  if (paths.length === 0) {
    return [];
  }

  const map = getScopeMap(userId, homeId);
  pruneExpired(map);

  const pathsToSign: string[] = [];
  const resolved = new Map<string, string>();

  for (const path of paths) {
    const cached = getValidCachedSignedUrl(userId, homeId, path);
    if (cached) {
      resolved.set(path, cached);
    } else {
      pathsToSign.push(path);
    }
  }

  if (pathsToSign.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrls(pathsToSign, GALLERY_SIGNED_URL_TTL_SECONDS);

    if (signError) {
      throw signError;
    }

    const stored: { path: string; signedUrl: string }[] = [];

    for (const row of signed ?? []) {
      if (row.error || !row.signedUrl || !row.path) {
        continue;
      }
      stored.push({ path: row.path, signedUrl: row.signedUrl });
      resolved.set(row.path, row.signedUrl);
    }

    storeSignedUrls(userId, homeId, stored);
  }

  const files: { name: string; url: string }[] = [];
  for (const path of paths) {
    const url = resolved.get(path);
    if (!url) {
      continue;
    }
    files.push({
      name: fileNameFromStoragePath(path),
      url,
    });
  }

  return files;
}
