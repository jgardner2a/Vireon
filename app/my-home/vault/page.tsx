"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildVaultEntries,
  buildVaultExportBundle,
  enrichFeedsWithAddresses,
  filterFeedsByProperty,
  groupVaultByProperty,
  vaultSummary,
} from "./buildVault";
import { VaultTimeline } from "./VaultTimeline";
import type { VaultPropertyFeed } from "./types";
import {
  btnSecondary,
  emptyState,
  field,
  h1,
  label,
  meta,
  page,
  pageHeader,
  pageHeaderStack,
  subtitle,
  input,
} from "../ui";

type PropertyOption = { id: string; name: string };

export default function VaultPage() {
  const [feeds, setFeeds] = useState<VaultPropertyFeed[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  const [exportPreview, setExportPreview] = useState<string | null>(null);

  useEffect(() => {
    const entries = buildVaultEntries();
    const grouped = enrichFeedsWithAddresses(groupVaultByProperty(entries));
    setFeeds(grouped);

    const props: PropertyOption[] = JSON.parse(
      localStorage.getItem("properties") || "[]"
    ).map((p: { id: string | number; name: string }) => ({
      id: String(p.id),
      name: p.name,
    }));
    setProperties(props);
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

  const handleExportPreview = () => {
    const bundle = buildVaultExportBundle({
      propertyId: filterPropertyId === "all" ? null : filterPropertyId,
    });
    setExportPreview(JSON.stringify(bundle, null, 2));
  };

  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Vault</h1>
          <p style={subtitle}>
            Chronological evidence timeline across properties
          </p>
        </div>
      </header>

      <div className="vault-export-bar" style={{ marginBottom: 28 }}>
        <div className="vault-export-bar-inner">
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              Export-ready archive
            </p>
            <p style={{ ...meta, marginTop: 4 }}>
              {summary.totalEntries} entries · {summary.issueCount} issues ·{" "}
              {summary.imageCount} images · {summary.propertyCount}{" "}
              {summary.propertyCount === 1 ? "property" : "properties"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              className="my-home-btn-primary"
              disabled
              title="Full PDF / legal export coming soon"
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              Export report
            </button>
            <button
              type="button"
              className="my-home-btn-secondary"
              style={btnSecondary}
              onClick={handleExportPreview}
            >
              Preview JSON
            </button>
          </div>
        </div>
        <p style={{ ...meta, marginTop: 10 }}>
          Bundles use format <code>vireon-vault-v1</code> for a future export
          pipeline.
        </p>
      </div>

      <div style={{ ...field, maxWidth: 320, marginBottom: 32 }}>
        <label style={label} htmlFor="vault-property-filter">
          Property
        </label>
        <select
          id="vault-property-filter"
          className="my-home-input"
          value={filterPropertyId}
          onChange={(e) => {
            setFilterPropertyId(e.target.value);
            setExportPreview(null);
          }}
          style={input}
        >
          <option value="all">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {visibleFeeds.length === 0 ? (
        <div style={emptyState}>
          No vault entries yet. Log issues or upload images to build your
          evidence timeline.
        </div>
      ) : (
        <VaultTimeline feeds={visibleFeeds} />
      )}

      {exportPreview && (
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Export bundle preview
            </h2>
            <button
              type="button"
              className="my-home-btn-ghost"
              style={{ width: "auto", padding: "6px 12px" }}
              onClick={() => setExportPreview(null)}
            >
              Close
            </button>
          </div>
          <pre className="vault-export-preview">{exportPreview}</pre>
        </div>
      )}
    </div>
  );
}
