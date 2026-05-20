"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AddPropertyButton } from "../components/AddPropertyButton";
import { usePropertyCreationLimit } from "../hooks/usePropertyCreationLimit";
import {
  useProfileId,
  useSubscriptionPlan,
} from "@/lib/subscription/useSubscriptionPlan";
import { PROPERTY_RESIDENCE_CURRENT } from "@/lib/property/residenceStatus";
import { isPro } from "@/lib/subscription/subscription";
import {
  listProperties,
  setCurrentProperty,
  type Property,
} from "@/lib/propertiesStore";
import {
  emptyState,
  h1,
  listCard,
  listCardBody,
  listCardTitle,
  page,
  pageHeader,
  pageHeaderStack,
  stack,
  subtitle,
} from "../ui";

function residenceLabel(status: Property["residenceStatus"]): string {
  return status === PROPERTY_RESIDENCE_CURRENT
    ? "Current home"
    : "Previous rental";
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { canCreate, limitReached } = usePropertyCreationLimit();
  const profileId = useProfileId();
  const { plan } = useSubscriptionPlan(profileId);
  const pro = plan ? isPro(plan) : false;

  const refresh = useCallback(() => {
    setProperties(listProperties());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSetCurrent(propertyId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActionError(null);
    setSwitchingId(propertyId);
    const result = await setCurrentProperty(propertyId);
    setSwitchingId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    refresh();
  }

  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Properties</h1>
          <p style={subtitle}>
            Current home and rental history (stored on your account)
          </p>
        </div>
        <div className="my-home-page-header-actions">
          <AddPropertyButton />
        </div>
      </header>

      {actionError ? (
        <p
          className="my-home-form-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {actionError}
        </p>
      ) : null}

      <div style={stack}>
        {properties.length === 0 ? (
          <div style={emptyState}>
            No properties yet.{" "}
            {canCreate && !limitReached ? (
              <Link href="/my-home/properties/new">Add your first property</Link>
            ) : null}
          </div>
        ) : (
          properties.map((p) => (
            <div key={p.id}>
              <Link
                href={`/my-home/properties/${p.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="my-home-list-card" style={listCard}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={listCardTitle}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        opacity:
                          p.residenceStatus === PROPERTY_RESIDENCE_CURRENT
                            ? 1
                            : 0.7,
                      }}
                    >
                      {residenceLabel(p.residenceStatus)}
                    </span>
                  </div>
                  <p style={listCardBody}>{p.address}</p>
                </div>
              </Link>
              {pro && p.residenceStatus !== PROPERTY_RESIDENCE_CURRENT ? (
                <button
                  type="button"
                  className="my-home-btn-secondary"
                  style={{ marginTop: 8 }}
                  disabled={switchingId === String(p.id)}
                  onClick={(e) => void handleSetCurrent(String(p.id), e)}
                >
                  {switchingId === String(p.id)
                    ? "Updating…"
                    : "Set as current home"}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
