"use client";

import Link from "next/link";
import { loginHref, ROUTE_PLACES } from "@/lib/appNavigation";
import { useAuthSession } from "@/lib/useAuthSession";
import { useSavedPlaces } from "@/lib/useSavedPlaces";

export function PlacesSidebarFooter() {
  const { email, isAuthenticated } = useAuthSession();
  const { savedPlaces } = useSavedPlaces();

  return (
    <>
      <div className="places-shell-saved" id="saved-places">
        <p className="places-shell-saved__title">Saved places</p>
        {savedPlaces.length === 0 ? (
          <p className="places-shell-saved__empty">
            Save a location from search to see it here.
          </p>
        ) : (
          <ul className="places-shell-saved__list">
            {savedPlaces.map((place) => (
              <li key={place.id} className="places-shell-saved__item">
                <span className="places-shell-saved__name">{place.name}</span>
                {place.address ? (
                  <span className="places-shell-saved__address">
                    {place.address}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="places-shell-account">
        {isAuthenticated && email ? (
          <p className="my-home-user-email" title={email}>
            {email}
          </p>
        ) : (
          <Link href={loginHref(ROUTE_PLACES)} className="my-home-nav-link">
            Account / Login
          </Link>
        )}
      </div>
    </>
  );
}
