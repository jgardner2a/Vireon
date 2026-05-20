import type { IssueStatus } from "@/lib/issueStatus";
import type { VaultEntry, VaultPropertyFeed } from "@/lib/evidence/vault";

export type VaultEntryKindFilter = "all" | "issue" | "media" | "lease";

export type VaultFiltersState = {
  dateFrom: string;
  dateTo: string;
  entryKind: VaultEntryKindFilter;
  issueStatus: IssueStatus | "all";
};

export const DEFAULT_VAULT_FILTERS: VaultFiltersState = {
  dateFrom: "",
  dateTo: "",
  entryKind: "all",
  issueStatus: "all",
};

function entryKindMatches(
  entry: VaultEntry,
  kind: VaultEntryKindFilter
): boolean {
  if (kind === "all") return true;
  if (kind === "issue") return entry.type === "issue";
  if (kind === "lease") return entry.type === "lease";
  return entry.type === "image";
}

function entryDateInRange(
  entry: VaultEntry,
  dateFrom: string,
  dateTo: string
): boolean {
  const time = new Date(entry.occurredAt).getTime();
  if (Number.isNaN(time)) return true;

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`).getTime();
    if (!Number.isNaN(from) && time < from) return false;
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (!Number.isNaN(to) && time > to) return false;
  }

  return true;
}

export function filterVaultEntry(
  entry: VaultEntry,
  filters: VaultFiltersState
): boolean {
  if (!entryKindMatches(entry, filters.entryKind)) {
    return false;
  }

  if (
    filters.issueStatus !== "all" &&
    entry.type === "issue" &&
    entry.status !== filters.issueStatus
  ) {
    return false;
  }

  if (!entryDateInRange(entry, filters.dateFrom, filters.dateTo)) {
    return false;
  }

  return true;
}

export function applyVaultFiltersToFeeds(
  feeds: VaultPropertyFeed[],
  filters: VaultFiltersState
): VaultPropertyFeed[] {
  return feeds
    .map((feed) => ({
      ...feed,
      entries: feed.entries.filter((entry) => filterVaultEntry(entry, filters)),
    }))
    .filter((feed) => feed.entries.length > 0);
}

export function countActiveVaultFilters(filters: VaultFiltersState): number {
  let count = 0;
  if (filters.dateFrom) count += 1;
  if (filters.dateTo) count += 1;
  if (filters.entryKind !== "all") count += 1;
  if (filters.issueStatus !== "all") count += 1;
  return count;
}
