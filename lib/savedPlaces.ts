import { getAuthEmail } from "./authSession";
import type { PlaceListing } from "./placesCatalog";

export type SavedPlace = PlaceListing & {
  savedAt: string;
};

export const SAVED_PLACES_EVENT = "vireon:saved-places-changed";

function storageKeyForEmail(email: string) {
  return `vireon:saved-places:${email.trim().toLowerCase()}`;
}

function legacyStorageKeyForEmail(email: string) {
  return `savedPlaces:${email.trim().toLowerCase()}`;
}

function readRaw(email: string): SavedPlace[] {
  try {
    const key = storageKeyForEmail(email);
    let raw = localStorage.getItem(key);
    if (raw === null) {
      const legacyKey = legacyStorageKeyForEmail(email);
      const legacy = localStorage.getItem(legacyKey);
      if (legacy !== null) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(legacyKey);
        raw = legacy;
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPlace[]) : [];
  } catch {
    return [];
  }
}

function writeRaw(email: string, places: SavedPlace[]) {
  localStorage.setItem(storageKeyForEmail(email), JSON.stringify(places));
}

export function notifySavedPlacesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SAVED_PLACES_EVENT));
}

/** Ensures a per-user saved-places bucket exists (empty array). */
export function initializeSavedPlacesForUser(email: string) {
  if (typeof window === "undefined") return;
  const key = storageKeyForEmail(email);
  if (localStorage.getItem(key) === null) {
    localStorage.setItem(key, JSON.stringify([]));
    notifySavedPlacesChanged();
  }
}

/** Loads saved places for the current authenticated user only. */
export function loadSavedPlaces(): SavedPlace[] {
  const email = getAuthEmail();
  if (!email) return [];

  return readRaw(email).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function isPlaceSaved(listingId: string): boolean {
  return loadSavedPlaces().some((p) => p.id === listingId);
}

export type ToggleSavedResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "auth" };

/** Adds a listing if not already saved (does not unsave). */
export function savePlace(listing: PlaceListing): ToggleSavedResult {
  const email = getAuthEmail();
  if (!email) {
    return { ok: false, reason: "auth" };
  }

  const current = readRaw(email);
  if (current.some((p) => p.id === listing.id)) {
    return { ok: true, saved: true };
  }

  const entry: SavedPlace = {
    ...listing,
    savedAt: new Date().toISOString(),
  };

  writeRaw(email, [...current, entry]);
  notifySavedPlacesChanged();
  return { ok: true, saved: true };
}

export function toggleSavedPlace(listing: PlaceListing): ToggleSavedResult {
  const email = getAuthEmail();
  if (!email) {
    return { ok: false, reason: "auth" };
  }

  const current = readRaw(email);
  const index = current.findIndex((p) => p.id === listing.id);

  if (index >= 0) {
    current.splice(index, 1);
    writeRaw(email, current);
    notifySavedPlacesChanged();
    return { ok: true, saved: false };
  }

  const entry: SavedPlace = {
    ...listing,
    savedAt: new Date().toISOString(),
  };

  writeRaw(email, [...current, entry]);
  notifySavedPlacesChanged();
  return { ok: true, saved: true };
}

export function unsavePlace(listingId: string): ToggleSavedResult {
  const email = getAuthEmail();
  if (!email) {
    return { ok: false, reason: "auth" };
  }

  const next = readRaw(email).filter((p) => p.id !== listingId);
  writeRaw(email, next);
  notifySavedPlacesChanged();
  return { ok: true, saved: false };
}

export function savedPlaceMeta(place: SavedPlace) {
  if (place.address) {
    const category =
      place.beds && place.beds !== "Place" ? place.beds : null;
    return category ? `${category} · ${place.address}` : place.address;
  }
  return `Saved · ${place.beds}`;
}
