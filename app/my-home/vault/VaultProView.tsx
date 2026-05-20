"use client";

import { useMemo, useState } from "react";
import { VaultFilterBar } from "./VaultFilterBar";
import { VaultRelationshipMap } from "./VaultRelationshipMap";
import { VaultTimeline } from "./VaultTimeline";
import {
  applyVaultFiltersToFeeds,
  DEFAULT_VAULT_FILTERS,
  type VaultFiltersState,
} from "./vaultFilters";
import type { VaultPropertyFeed } from "@/lib/evidence/vault";

type VaultProViewProps = {
  feeds: VaultPropertyFeed[];
};

export function VaultProView({ feeds }: VaultProViewProps) {
  const [filters, setFilters] = useState<VaultFiltersState>(DEFAULT_VAULT_FILTERS);

  const filteredFeeds = useMemo(
    () => applyVaultFiltersToFeeds(feeds, filters),
    [feeds, filters]
  );

  return (
    <section className="vault-pro-view" aria-label="Pro vault timeline">
      <VaultRelationshipMap feeds={feeds} />

      <VaultFilterBar filters={filters} onChange={setFilters} />

      {filteredFeeds.length === 0 ? (
        <div className="my-home-empty" style={{ marginTop: 24 }}>
          No entries match your filters. Try adjusting the date range or entry
          type.
        </div>
      ) : (
        <div style={{ marginTop: 28 }}>
          <VaultTimeline feeds={filteredFeeds} showCrossLinks />
        </div>
      )}
    </section>
  );
}
