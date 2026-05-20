import type { PlaceListing } from "./placesCatalog";
import { savePlace } from "./savedPlaces";

const PENDING_KEY = "vireon:pending-place-save";

export function setPendingPlaceSave(listing: PlaceListing): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(listing));
}

export function getPendingPlaceSave(): PlaceListing | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaceListing;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPlaceSave(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_KEY);
}

/** Saves the pending listing for the current user and clears session storage. */
export function applyPendingPlaceSave(): boolean {
  const listing = getPendingPlaceSave();
  if (!listing) return false;

  clearPendingPlaceSave();
  const result = savePlace(listing);
  return result.ok;
}
