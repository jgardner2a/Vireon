/**
 * Allowlist for browser localStorage keys.
 * Core renter data MUST NOT use localStorage — see docs/DATA_SOURCE_AUDIT.md
 */

export const ALLOWED_LOCAL_STORAGE_PREFIXES = [
  "auth",
  "vireon-personal-checklist:",
  "vireon:saved-places:",
  "savedPlaces:", // legacy prefix (migrated on read in savedPlaces.ts)
  "vireon-gallery-empty-reset-v1",
] as const;

/** @deprecated Legacy keys — must not be written after Supabase migration */
export const FORBIDDEN_CORE_DATA_KEYS = [
  "properties",
  "issues",
  "gallery",
  "galleryFolders",
  "leases",
  "incidents",
  "documents",
  "vireonUsers",
] as const;

export function isAllowedLocalStorageKey(key: string): boolean {
  if (FORBIDDEN_CORE_DATA_KEYS.includes(key as (typeof FORBIDDEN_CORE_DATA_KEYS)[number])) {
    return false;
  }
  return ALLOWED_LOCAL_STORAGE_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix)
  );
}

export function assertAllowedLocalStorageKey(key: string): void {
  if (!isAllowedLocalStorageKey(key)) {
    throw new Error(
      `localStorage key "${key}" is not allowlisted. Core renter data belongs in Supabase.`
    );
  }
}

export function guardCoreDataWrite(key: string): void {
  if (FORBIDDEN_CORE_DATA_KEYS.includes(key as (typeof FORBIDDEN_CORE_DATA_KEYS)[number])) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[Vireon] Blocked localStorage write to forbidden core key "${key}". Use Supabase.`
      );
    }
    throw new Error(`Cannot persist core data to localStorage key: ${key}`);
  }
}
