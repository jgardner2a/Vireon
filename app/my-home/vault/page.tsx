"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useProfileId,
  useSubscriptionPlan,
} from "@/lib/subscription/useSubscriptionPlan";
import {
  buildVaultEntries,
  enrichFeedsWithAddresses,
  filterFeedsByProperty,
  groupVaultByProperty,
  vaultSummary,
} from "@/lib/evidence/vault";
import { VaultSummaryView } from "./VaultSummaryView";
import { VaultProView } from "./VaultProView";
import { VaultRelationshipPreview } from "./VaultRelationshipPreview";
import { VaultTimelinePreview } from "./VaultTimelinePreview";
import { VaultExportBar } from "./VaultExportBar";
import type { VaultPropertyFeed } from "@/lib/evidence/vault";
import { readPropertiesForVault } from "@/lib/evidence/vault/reads";
import { getCurrentProperty } from "@/lib/propertiesStore";

import type { Property } from "@/lib/propertiesStore";

type PropertyOption = Pick<Property, "id" | "name" | "residenceStatus">;

export default function VaultPage() {
  const profileId = useProfileId();
  const {
    plan,
    ready: planReady,
    error: planError,
    hasFullVaultAccess,
  } = useSubscriptionPlan(profileId);
  const [feeds, setFeeds] = useState<VaultPropertyFeed[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");

  useEffect(() => {
    const entries = buildVaultEntries();
    const grouped = enrichFeedsWithAddresses(groupVaultByProperty(entries));
    setFeeds(grouped);

    const props = readPropertiesForVault();
    setProperties(
      props.map((p) => ({
        id: String(p.id),
        name: p.name,
        residenceStatus: p.residenceStatus,
      }))
    );
    const current = getCurrentProperty();
    if (current) {
      setFilterPropertyId(String(current.id));
    }
  }, []);

  const visibleFeeds = useMemo(() => {
    if (filterPropertyId === "all") return feeds;
    return filterFeedsByProperty(feeds, filterPropertyId);
  }, [feeds, filterPropertyId]);

  const visibleEntries = useMemo(
    () => visibleFeeds.flatMap((f) => f.entries),
    [visibleFeeds]
  );

  const summary = useMemo(
    () => vaultSummary(visibleEntries, visibleFeeds),
    [visibleEntries, visibleFeeds]
  );

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">Evidence Vault</h1>
          <p className="my-home-subtitle">
            Read-only evidence visualization — relationships resolved from My
            Home, never stored separately here
          </p>
        </div>
      </header>

      <p className="vault-readonly-banner" role="status">
        The Vault only visualizes evidence: it resolves links and groups media
        from My Home. To create or change evidence, use Gallery or your issue
        and lease records.
      </p>

      {!planReady ? (
        <p className="my-home-text-muted" style={{ marginBottom: 20 }} role="status">
          Loading subscription…
        </p>
      ) : planError || (profileId && !plan) ? (
        <p className="my-home-form-error" style={{ marginBottom: 20 }} role="alert">
          Could not load your subscription plan.
        </p>
      ) : !hasFullVaultAccess ? (
        <p className="my-home-text-muted" style={{ marginBottom: 20 }}>
          Free plan: summary, limited relationship preview, and collapsed
          timeline. Upgrade to Pro for the full relationship map and timeline.
        </p>
      ) : null}

      <VaultSummaryView summary={summary} />

      <div className="my-home-field vault-filter" style={{ marginTop: 28 }}>
        <label className="my-home-label" htmlFor="vault-property-filter">
          Property
        </label>
        <select
          id="vault-property-filter"
          className="my-home-input"
          value={filterPropertyId}
          onChange={(e) => setFilterPropertyId(e.target.value)}
        >
          <option value="all">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <VaultExportBar
        filterPropertyId={filterPropertyId}
        properties={properties}
        plan={plan}
        planReady={planReady}
      />

      {visibleFeeds.length === 0 ? (
        <div className="my-home-empty" style={{ marginTop: 24 }}>
          No vault entries yet. Log issues or upload gallery media in My Home
          to build your evidence timeline.
        </div>
      ) : !planReady ? null : !plan ? null : hasFullVaultAccess ? (
        <VaultProView feeds={visibleFeeds} />
      ) : (
        <>
          <VaultRelationshipPreview feeds={visibleFeeds} />
          <VaultTimelinePreview feeds={visibleFeeds} />
        </>
      )}
    </>
  );
}
