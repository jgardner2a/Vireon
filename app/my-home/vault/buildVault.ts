import { normalizeIssueStatus } from "../issueStatus";
import type {
  VaultEntry,
  VaultExportBundle,
  VaultImageEntry,
  VaultIssueEntry,
  VaultPropertyFeed,
} from "./types";

const UNLINKED_PROPERTY_NAME = "Unlinked evidence";
const EXPORT_VERSION = 1 as const;

interface StoredProperty {
  id: string | number;
  name: string;
  address?: string;
}

interface StoredIssue {
  id: string | number;
  title: string;
  description: string;
  propertyId: string | number;
  status?: string;
  images?: string[];
  createdAt: string;
}

type GalleryItem = string | { dataUrl: string; createdAt?: string; propertyId?: string | number };

function sortNewestFirst(a: VaultEntry, b: VaultEntry) {
  return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
}

function propertyLookup(properties: StoredProperty[]) {
  const map = new Map<string, StoredProperty>();
  for (const p of properties) {
    map.set(String(p.id), p);
  }
  return map;
}

function resolveProperty(
  propertyId: string | number | null | undefined,
  map: Map<string, StoredProperty>
) {
  if (propertyId == null || propertyId === "") {
    return {
      propertyId: null,
      propertyName: UNLINKED_PROPERTY_NAME,
      propertyAddress: undefined,
    };
  }
  const p = map.get(String(propertyId));
  return {
    propertyId: String(propertyId),
    propertyName: p?.name ?? "Unknown property",
    propertyAddress: p?.address,
  };
}

function issueEntry(
  issue: StoredIssue,
  map: Map<string, StoredProperty>
): VaultIssueEntry {
  const prop = resolveProperty(issue.propertyId, map);
  const status = normalizeIssueStatus(issue.status);
  const occurredAt = issue.createdAt;
  const id = `issue:${issue.id}`;

  return {
    id,
    type: "issue",
    ...prop,
    occurredAt,
    issueId: issue.id,
    title: issue.title,
    description: issue.description,
    status,
    imageCount: issue.images?.length ?? 0,
    exportMeta: {
      entryId: id,
      recordType: "issue",
      recordId: String(issue.id),
      propertyId: prop.propertyId,
      occurredAt,
      exportVersion: EXPORT_VERSION,
    },
  };
}

function issueImageEntries(
  issue: StoredIssue,
  map: Map<string, StoredProperty>
): VaultImageEntry[] {
  const images = issue.images ?? [];
  if (images.length === 0) return [];

  const prop = resolveProperty(issue.propertyId, map);
  const baseTime = new Date(issue.createdAt).getTime();

  return images.map((imageUrl, index) => {
    const id = `issue-image:${issue.id}:${index}`;
    const occurredAt = new Date(baseTime + index).toISOString();

    return {
      id,
      type: "image",
      ...prop,
      occurredAt,
      imageUrl,
      imageSource: "issue",
      issueId: issue.id,
      issueTitle: issue.title,
      caption: `Evidence for: ${issue.title}`,
      exportMeta: {
        entryId: id,
        recordType: "issue",
        recordId: String(issue.id),
        propertyId: prop.propertyId,
        occurredAt,
        exportVersion: EXPORT_VERSION,
      },
    };
  });
}

function galleryImageEntries(
  gallery: GalleryItem[],
  map: Map<string, StoredProperty>
): VaultImageEntry[] {
  const legacyBase = Date.parse("1970-01-01T00:00:00.000Z");

  return gallery.map((item, index) => {
    const isLegacy = typeof item === "string";
    const imageUrl = isLegacy ? item : item.dataUrl;
    const occurredAt = isLegacy
      ? new Date(legacyBase + index).toISOString()
      : item.createdAt ?? new Date().toISOString();
    const propertyId = isLegacy ? null : item.propertyId ?? null;
    const prop = resolveProperty(propertyId, map);
    const id = `gallery:${index}`;

    return {
      id,
      type: "image",
      ...prop,
      occurredAt,
      imageUrl,
      imageSource: "gallery",
      caption: isLegacy
        ? "Gallery upload (date estimated)"
        : "Gallery upload",
      exportMeta: {
        entryId: id,
        recordType: "gallery",
        recordId: String(index),
        propertyId: prop.propertyId,
        occurredAt,
        exportVersion: EXPORT_VERSION,
      },
    };
  });
}

/** Build flat timeline from localStorage */
export function buildVaultEntries(): VaultEntry[] {
  const properties: StoredProperty[] = JSON.parse(
    localStorage.getItem("properties") || "[]"
  );
  const issues: StoredIssue[] = JSON.parse(
    localStorage.getItem("issues") || "[]"
  );
  const gallery: GalleryItem[] = JSON.parse(
    localStorage.getItem("gallery") || "[]"
  );

  const map = propertyLookup(properties);
  const entries: VaultEntry[] = [];

  for (const issue of issues) {
    entries.push(issueEntry(issue, map));
    entries.push(...issueImageEntries(issue, map));
  }

  entries.push(...galleryImageEntries(gallery, map));

  return entries.sort(sortNewestFirst);
}

/** Group entries into per-property chronological feeds */
export function enrichFeedsWithAddresses(
  feeds: VaultPropertyFeed[]
): VaultPropertyFeed[] {
  const properties: StoredProperty[] = JSON.parse(
    localStorage.getItem("properties") || "[]"
  );
  const map = propertyLookup(properties);
  return feeds.map((feed) => {
    if (!feed.propertyId) return feed;
    const p = map.get(feed.propertyId);
    return { ...feed, propertyAddress: p?.address };
  });
}

export function groupVaultByProperty(entries: VaultEntry[]): VaultPropertyFeed[] {
  const byKey = new Map<string, VaultPropertyFeed>();

  for (const entry of entries) {
    const key = entry.propertyId ?? "__unlinked__";
    let feed = byKey.get(key);
    if (!feed) {
      feed = {
        propertyId: entry.propertyId,
        propertyName: entry.propertyName,
        entries: [],
      };
      byKey.set(key, feed);
    }
    feed.entries.push(entry);
  }

  const feeds = Array.from(byKey.values()).map((feed) => ({
    ...feed,
    entries: [...feed.entries].sort(sortNewestFirst),
  }));

  feeds.sort((a, b) => {
    const aTime = a.entries[0]?.occurredAt ?? "";
    const bTime = b.entries[0]?.occurredAt ?? "";
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return feeds;
}

export function filterFeedsByProperty(
  feeds: VaultPropertyFeed[],
  propertyId: string | null
): VaultPropertyFeed[] {
  if (propertyId === null) return feeds;
  return feeds.filter((f) => f.propertyId === propertyId);
}

export function vaultSummary(entries: VaultEntry[], feeds: VaultPropertyFeed[]) {
  return {
    totalEntries: entries.length,
    issueCount: entries.filter((e) => e.type === "issue").length,
    imageCount: entries.filter((e) => e.type === "image").length,
    propertyCount: feeds.length,
  };
}

/** Export-ready bundle for a future PDF/JSON report feature */
export function buildVaultExportBundle(options?: {
  propertyId?: string | null;
}): VaultExportBundle {
  const entries = buildVaultEntries();
  const allFeeds = enrichFeedsWithAddresses(groupVaultByProperty(entries));
  const propertyId = options?.propertyId ?? null;
  const feeds = filterFeedsByProperty(allFeeds, propertyId);
  const scopedEntries = feeds.flatMap((f) => f.entries);
  const summary = vaultSummary(scopedEntries, feeds);

  const targetFeed =
    propertyId != null ? feeds.find((f) => f.propertyId === propertyId) : null;

  return {
    format: "vireon-vault-v1",
    generatedAt: new Date().toISOString(),
    scope: propertyId != null ? "property" : "all",
    propertyId,
    propertyName: targetFeed?.propertyName ?? null,
    summary,
    feeds,
  };
}

export function formatVaultDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
