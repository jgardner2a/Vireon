"use client";

/** Contextual Places sidebar nav — top-level routes live in GlobalHeader only. */
export function PlacesWorkspaceSidebar() {
  return (
    <>
      <p className="my-home-nav-label">On this page</p>
      <nav className="my-home-nav" aria-label="Places tools">
        <a href="#location-search" className="my-home-nav-link">
          Search
        </a>
        <a href="#saved-places" className="my-home-nav-link">
          Saved places
        </a>
      </nav>
      <p className="places-shell-sidebar-hint">
        Use the panel beside the map to search and save locations.
      </p>
    </>
  );
}
