"use client";

import { ISSUE_STATUSES } from "@/lib/issueStatus";
import {
  countActiveVaultFilters,
  DEFAULT_VAULT_FILTERS,
  type VaultFiltersState,
} from "./vaultFilters";

type VaultFilterBarProps = {
  filters: VaultFiltersState;
  onChange: (filters: VaultFiltersState) => void;
};

export function VaultFilterBar({ filters, onChange }: VaultFilterBarProps) {
  const activeCount = countActiveVaultFilters(filters);

  const patch = (partial: Partial<VaultFiltersState>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <section className="vault-pro-filters" aria-label="Vault filters">
      <div className="vault-pro-filters__header">
        <h2 className="my-home-section-title" style={{ margin: 0 }}>
          Filters
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            className="my-home-btn-ghost"
            style={{ width: "auto", padding: "6px 12px" }}
            onClick={() => onChange(DEFAULT_VAULT_FILTERS)}
          >
            Clear ({activeCount})
          </button>
        ) : null}
      </div>

      <div className="vault-pro-filters__grid">
        <div className="my-home-field">
          <label className="my-home-label" htmlFor="vault-date-from">
            Date from
          </label>
          <input
            id="vault-date-from"
            type="date"
            className="my-home-input"
            value={filters.dateFrom}
            onChange={(e) => patch({ dateFrom: e.target.value })}
          />
        </div>

        <div className="my-home-field">
          <label className="my-home-label" htmlFor="vault-date-to">
            Date to
          </label>
          <input
            id="vault-date-to"
            type="date"
            className="my-home-input"
            value={filters.dateTo}
            onChange={(e) => patch({ dateTo: e.target.value })}
          />
        </div>

        <div className="my-home-field">
          <label className="my-home-label" htmlFor="vault-entry-kind">
            Entry type
          </label>
          <select
            id="vault-entry-kind"
            className="my-home-input"
            value={filters.entryKind}
            onChange={(e) =>
              patch({
                entryKind: e.target.value as VaultFiltersState["entryKind"],
              })
            }
          >
            <option value="all">All types</option>
            <option value="issue">Issues</option>
            <option value="media">Media</option>
            <option value="lease">Leases</option>
          </select>
        </div>

        <div className="my-home-field">
          <label className="my-home-label" htmlFor="vault-issue-status">
            Issue status
          </label>
          <select
            id="vault-issue-status"
            className="my-home-input"
            value={filters.issueStatus}
            disabled={
              filters.entryKind === "media" || filters.entryKind === "lease"
            }
            onChange={(e) =>
              patch({
                issueStatus: e.target.value as VaultFiltersState["issueStatus"],
              })
            }
          >
            <option value="all">All statuses</option>
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
