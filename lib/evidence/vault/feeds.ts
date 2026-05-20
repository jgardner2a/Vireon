import { readPropertiesForVault } from "./reads";
import type { VaultEntry, VaultPropertyFeed } from "./types";

function sortNewestFirst(a: VaultEntry, b: VaultEntry) {
  return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
}

interface StoredProperty {
  id: string | number;
  name: string;
  address?: string;
}

function propertyLookup(properties: StoredProperty[]) {
  const map = new Map<string, StoredProperty>();
  for (const p of properties) {
    map.set(String(p.id), p);
  }
  return map;
}

export function enrichFeedsWithAddresses(
  feeds: VaultPropertyFeed[]
): VaultPropertyFeed[] {
  const map = propertyLookup(readPropertiesForVault());
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
