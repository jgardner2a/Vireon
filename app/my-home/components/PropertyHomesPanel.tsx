"use client";

/**
 * My Home — current / other homes (membership path UI).
 * Uses property_members.is_current; does not use legacy properties.user_id.
 */

import { usePropertyContext } from "../hooks/usePropertyContext";
import type { Property } from "@/lib/property/types";

function PropertyRow({
  property,
  action,
}: {
  property: Property;
  action?: React.ReactNode;
}) {
  return (
    <li className="my-home-property-row">
      <div className="my-home-property-row__body">
        <p className="my-home-property-row__name">{property.name}</p>
        <p className="my-home-text-muted">{property.address}</p>
      </div>
      {action ? (
        <div className="my-home-property-row__action">{action}</div>
      ) : null}
    </li>
  );
}

export function PropertyHomesPanel() {
  const {
    status,
    message,
    currentProperty,
    otherProperties,
    allProperties,
    loading,
    switchingPropertyId,
    switchError,
    switchCurrentProperty,
    refresh,
  } = usePropertyContext();

  if (loading) {
    return (
      <section className="my-home-card" aria-label="Your homes" aria-busy="true">
        <p className="my-home-text-muted" role="status">
          Loading your homes…
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="my-home-card" aria-label="Your homes">
        <p className="my-home-form-error" role="alert">
          {message ?? "Could not load your properties."}
        </p>
        <button
          type="button"
          className="my-home-btn-secondary"
          onClick={() => void refresh()}
        >
          Retry
        </button>
      </section>
    );
  }

  if (status === "empty") {
    return (
      <section className="my-home-card" aria-label="Your homes">
        <h2 className="my-home-card-title">Your homes</h2>
        <p className="my-home-text-muted" role="status">
          {message ??
            "You are not linked to any properties yet. Membership rows in property_members are required."}
        </p>
      </section>
    );
  }

  const homesToPick =
    status === "no_current" ? allProperties : otherProperties;

  return (
    <div className="my-home-property-sections">
      <section className="my-home-card" aria-label="Current home">
        <h2 className="my-home-card-title">Current home</h2>
        {currentProperty ? (
          <PropertyRow property={currentProperty} />
        ) : (
          <p className="my-home-text-muted" role="status">
            {message ?? "No current home selected."}
          </p>
        )}
      </section>

      {homesToPick.length > 0 ? (
        <section className="my-home-card" aria-label="Other homes">
          <h2 className="my-home-card-title">
            {status === "no_current" ? "Select a home" : "Other homes"}
          </h2>
          <ul className="my-home-property-list">
            {homesToPick.map((property) => (
              <PropertyRow
                key={property.id}
                property={property}
                action={
                  <button
                    type="button"
                    className="my-home-btn-secondary"
                    disabled={switchingPropertyId === property.id}
                    onClick={() => void switchCurrentProperty(property.id)}
                  >
                    {switchingPropertyId === property.id
                      ? "Switching…"
                      : "Set as current"}
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {switchError ? (
        <p className="my-home-form-error" role="alert">
          {switchError}
        </p>
      ) : null}
    </div>
  );
}
