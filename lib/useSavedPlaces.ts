"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getAuthEmail } from "./authSession";
import type { PlaceListing } from "./placesCatalog";
import {
  loadSavedPlaces,
  SAVED_PLACES_EVENT,
  savePlace,
  toggleSavedPlace,
  unsavePlace,
  type SavedPlace,
  type ToggleSavedResult,
} from "./savedPlaces";

export function useSavedPlaces() {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() =>
    typeof window !== "undefined" ? loadSavedPlaces() : []
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => typeof window !== "undefined" && !!getAuthEmail()
  );

  const refresh = useCallback(() => {
    setSavedPlaces(loadSavedPlaces());
    setIsAuthenticated(!!getAuthEmail());
  }, []);

  useEffect(() => {
    refresh();

    const onSync = () => refresh();

    window.addEventListener(SAVED_PLACES_EVENT, onSync);
    window.addEventListener(AUTH_CHANGED_EVENT, onSync);
    window.addEventListener("storage", onSync);

    return () => {
      window.removeEventListener(SAVED_PLACES_EVENT, onSync);
      window.removeEventListener(AUTH_CHANGED_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const handleSave = useCallback(
    (listing: PlaceListing): ToggleSavedResult => {
      const result = savePlace(listing);
      refresh();
      return result;
    },
    [refresh]
  );

  const handleToggle = useCallback(
    (listing: PlaceListing): ToggleSavedResult => {
      const result = toggleSavedPlace(listing);
      refresh();
      return result;
    },
    [refresh]
  );

  const handleUnsave = useCallback(
    (listingId: string): ToggleSavedResult => {
      const result = unsavePlace(listingId);
      refresh();
      return result;
    },
    [refresh]
  );

  const isSaved = useCallback(
    (listingId: string) => savedPlaces.some((p) => p.id === listingId),
    [savedPlaces]
  );

  return {
    savedPlaces,
    isAuthenticated,
    isSaved,
    save: handleSave,
    toggleSave: handleToggle,
    unsave: handleUnsave,
    refresh,
  };
}
