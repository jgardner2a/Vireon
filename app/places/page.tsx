"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthModal } from "@/app/components/AuthModal";
import { PlacesMap } from "@/app/components/PlacesMap";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  geocodeQuery,
  zoomForLocationType,
  type SearchLocation,
} from "@/lib/geocodeSearch";
import { placeListingFromSearchLocation } from "@/lib/placeListingFromSearch";
import {
  applyPendingPlaceSave,
  setPendingPlaceSave,
} from "@/lib/pendingPlaceSave";
import { useSavedPlaces } from "@/lib/useSavedPlaces";

const SEARCH_DEBOUNCE_MS = 350;

export default function PlacesPage() {
  const router = useRouter();
  const { isAuthenticated, isSaved, save, refresh } = useSavedPlaces();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchLocation[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<SearchLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const selectedListing = useMemo(
    () =>
      selectedLocation
        ? placeListingFromSearchLocation(selectedLocation)
        : null,
    [selectedLocation]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    void geocodeQuery(query)
      .then((results) => {
        if (cancelled) return;
        setSearchResults(results);
      })
      .catch(() => {
        if (cancelled) return;
        setSearchResults([]);
        setSearchError("Search failed. Check your API key and Geocoding API.");
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelectLocation = useCallback((location: SearchLocation) => {
    setSelectedLocation(location);
  }, []);

  const finishSaveAndGoHome = useCallback(() => {
    router.push("/my-home");
  }, [router]);

  const handleAuthSuccess = useCallback(() => {
    applyPendingPlaceSave();
    refresh();
    setAuthModalOpen(false);
    finishSaveAndGoHome();
  }, [refresh, finishSaveAndGoHome]);

  const handleSave = useCallback(() => {
    if (!selectedListing) return;

    if (!isAuthenticated) {
      setPendingPlaceSave(selectedListing);
      setAuthModalOpen(true);
      return;
    }

    save(selectedListing);
    finishSaveAndGoHome();
  }, [
    selectedListing,
    isAuthenticated,
    save,
    finishSaveAndGoHome,
  ]);

  const mapCenter = useMemo(() => {
    if (selectedLocation) {
      return { lat: selectedLocation.lat, lng: selectedLocation.lng };
    }
    return DEFAULT_MAP_CENTER;
  }, [selectedLocation]);

  const mapZoom = useMemo(() => {
    if (selectedLocation) {
      return zoomForLocationType(selectedLocation.locationType);
    }
    return DEFAULT_MAP_ZOOM;
  }, [selectedLocation]);

  const mapMarker = useMemo(() => {
    if (!selectedLocation) return null;
    return {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      title: selectedLocation.name,
    };
  }, [selectedLocation]);

  return (
    <div className="vireon-places-search-layout">
      <aside className="vireon-places-sidebar" aria-label="Location search">
        <form
          className="vireon-places-sidebar__search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setDebouncedQuery(searchQuery.trim());
          }}
        >
          <label className="sr-only" htmlFor="location-search">
            Search locations
          </label>
          <input
            id="location-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cities, addresses, places…"
            autoComplete="off"
            className="vireon-places-sidebar__input"
          />
        </form>

        <div className="vireon-places-sidebar__results" aria-live="polite">
          {isSearching ? (
            <p className="vireon-places-sidebar__hint">Searching…</p>
          ) : searchError ? (
            <p className="vireon-places-sidebar__error" role="alert">
              {searchError}
            </p>
          ) : !debouncedQuery.trim() ? (
            <p className="vireon-places-sidebar__hint">
              Enter a location to search with Google Geocoding.
            </p>
          ) : searchResults.length === 0 ? (
            <p className="vireon-places-sidebar__hint">No results found.</p>
          ) : (
            <ul className="vireon-places-sidebar__list">
              {searchResults.map((result) => {
                const isSelected = selectedLocation?.id === result.id;
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocation(result)}
                      className={`vireon-places-sidebar__item${
                        isSelected ? " vireon-places-sidebar__item--active" : ""
                      }`}
                    >
                      <span className="vireon-places-sidebar__item-name">
                        {result.name}
                      </span>
                      <span className="vireon-places-sidebar__item-address">
                        {result.formattedAddress}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedListing ? (
          <div className="vireon-places-sidebar__save">
            <p className="vireon-places-sidebar__save-label">
              {selectedListing.name}
            </p>
            <button
              type="button"
              className="vireon-places-sidebar__save-btn"
              onClick={handleSave}
            >
              {selectedListing && isSaved(selectedListing.id)
                ? "Saved — open My Home"
                : "Save"}
            </button>
          </div>
        ) : null}
      </aside>

      <section className="vireon-places-map-panel" aria-label="Map">
        <PlacesMap center={mapCenter} zoom={mapZoom} marker={mapMarker} />
      </section>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
