import { normalizeIssueStatus } from "../../issueStatus";
import {
  readGalleryMediaForVault,
  readIssuesForVault,
  readLeasesForVault,
  readPropertiesForVault,
} from "./reads";
import {
  enrichFeedsWithAddresses,
  filterFeedsByProperty,
  groupVaultByProperty,
} from "./feeds";
import { resolveVaultGalleryMediaLink } from "./resolve";
import type {
  VaultEntry,
  VaultExportBundle,
  VaultImageEntry,
  VaultIssueEntry,
  VaultLeaseEntry,
  VaultPropertyFeed,
  VaultSummary,
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

function galleryMediaEntries(
  map: Map<string, StoredProperty>
): VaultImageEntry[] {
  return readGalleryMediaForVault().map((item) => {
    const prop = resolveProperty(item.propertyId || null, map);
    const id = `gallery:${item.id}`;
    const label = item.type === "video" ? "Gallery video" : "Gallery image";
    const relationship = resolveVaultGalleryMediaLink(item);

    const entry: VaultImageEntry = {
      id,
      type: "image",
      ...prop,
      occurredAt: item.createdAt,
      imageUrl: item.dataUrl,
      imageSource: "gallery",
      galleryMediaId: item.id,
      caption: relationship
        ? `${label}: ${item.name} · linked ${relationship.targetType}`
        : `${label}: ${item.name}`,
      exportMeta: {
        entryId: id,
        recordType: "gallery",
        recordId: String(item.id),
        propertyId: prop.propertyId,
        occurredAt: item.createdAt,
        exportVersion: EXPORT_VERSION,
      },
    };

    if (relationship) {
      entry.evidenceRelationship = relationship;
      if (relationship.targetType === "issue") {
        entry.issueId = relationship.targetId;
      }
    }

    return entry;
  });
}

function leaseEntries(map: Map<string, StoredProperty>): VaultLeaseEntry[] {
  return readLeasesForVault().map((lease) => {
    const prop = resolveProperty(lease.propertyId, map);
    const id = `lease:${lease.id}`;
    const occurredAt = lease.createdAt;

    return {
      id,
      type: "lease",
      ...prop,
      occurredAt,
      leaseId: lease.id,
      title: lease.title,
      startDate: lease.startDate,
      endDate: lease.endDate,
      exportMeta: {
        entryId: id,
        recordType: "lease",
        recordId: String(lease.id),
        propertyId: prop.propertyId,
        occurredAt,
        exportVersion: EXPORT_VERSION,
      },
    };
  });
}

function galleryLinkedIssueCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of readGalleryMediaForVault()) {
    const link = resolveVaultGalleryMediaLink(item);
    if (link?.targetType !== "issue") continue;
    const id = link.targetId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Builds the full vault timeline from My Home stores.
 * Read-only: never creates, modifies, or persists evidence.
 */
export function buildVaultEntries(): VaultEntry[] {
  const properties = readPropertiesForVault();
  const map = propertyLookup(properties);
  const entries: VaultEntry[] = [];
  const linkedGalleryByIssue = galleryLinkedIssueCounts();

  entries.push(...leaseEntries(map));

  for (const issue of readIssuesForVault()) {
    const stored: StoredIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      propertyId: issue.propertyId,
      status: issue.status,
      createdAt: issue.createdAt,
      images: [],
    };
    const entry = issueEntry(stored, map);
    entry.imageCount =
      linkedGalleryByIssue.get(String(issue.id)) ?? entry.imageCount;
    entries.push(entry);
    entries.push(...issueImageEntries(stored, map));
  }

  entries.push(...galleryMediaEntries(map));

  return entries.sort(sortNewestFirst);
}

function galleryIssueLinkCount(entries: VaultEntry[]): number {
  return entries.filter(
    (e): e is VaultImageEntry =>
      e.type === "image" &&
      e.imageSource === "gallery" &&
      e.evidenceRelationship?.targetType === "issue"
  ).length;
}

export function vaultSummary(
  entries: VaultEntry[],
  feeds: VaultPropertyFeed[]
): VaultSummary {
  return {
    totalEntries: entries.length,
    issueCount: entries.filter((e) => e.type === "issue").length,
    imageCount: entries.filter((e) => e.type === "image").length,
    leaseCount: entries.filter((e) => e.type === "lease").length,
    propertyCount: feeds.length,
    mediaIssueLinkCount: galleryIssueLinkCount(entries),
  };
}

/** In-memory export preview bundle (not persisted). */
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
