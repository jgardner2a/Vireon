import {
  formatSnapshotDate,
  snapshotTypeLabel,
} from "@/lib/snapshots/format";
import type { SnapshotType } from "@/lib/snapshots/types";
import { supabase } from "@/lib/supabaseClient";

export const SNAPSHOT_EVIDENCE_OWNER_TYPE = "snapshot" as const;

export type SnapshotEvidenceRecord = {
  ownerType: typeof SNAPSHOT_EVIDENCE_OWNER_TYPE;
  ownerId: string;
  label: string;
};

type SnapshotRow = {
  id: string;
  type: string;
  created_at: string;
};

type SnapshotImageLinkRow = {
  snapshot_id: string;
  gallery_id: string;
};

function isSnapshotType(value: string): value is SnapshotType {
  return value === "move_in" || value === "move_out";
}

export function buildSnapshotEvidenceLabel(row: SnapshotRow): string {
  const type = isSnapshotType(row.type) ? snapshotTypeLabel(row.type) : "Snapshot";
  return `${type} — ${formatSnapshotDate(row.created_at)}`;
}

export async function fetchSnapshotGalleryEvidence(
  homeId: string
): Promise<
  | {
      ok: true;
      records: SnapshotEvidenceRecord[];
      galleryIdsBySnapshotId: Map<string, Set<string>>;
    }
  | { ok: false; message: string }
> {
  const { data: snapshots, error: snapshotsError } = await supabase
    .from("snapshots")
    .select("id, type, created_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (snapshotsError) {
    console.error("[snapshots] gallery evidence fetch snapshots", snapshotsError);
    return {
      ok: false,
      message: snapshotsError.message || "Could not load snapshots.",
    };
  }

  const snapshotRows = (snapshots ?? []) as SnapshotRow[];
  const snapshotIds = snapshotRows.map((row) => row.id);
  const galleryIdsBySnapshotId = new Map<string, Set<string>>();

  for (const id of snapshotIds) {
    galleryIdsBySnapshotId.set(id, new Set());
  }

  if (snapshotIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("snapshot_images")
      .select("snapshot_id, gallery_id")
      .in("snapshot_id", snapshotIds);

    if (linksError) {
      console.error("[snapshots] gallery evidence fetch images", linksError);
      return {
        ok: false,
        message: linksError.message || "Could not load snapshot images.",
      };
    }

    for (const row of (links ?? []) as SnapshotImageLinkRow[]) {
      const bucket = galleryIdsBySnapshotId.get(row.snapshot_id);
      if (bucket && row.gallery_id) {
        bucket.add(String(row.gallery_id));
      }
    }
  }

  const records: SnapshotEvidenceRecord[] = snapshotRows.map((row) => ({
    ownerType: SNAPSHOT_EVIDENCE_OWNER_TYPE,
    ownerId: row.id,
    label: buildSnapshotEvidenceLabel(row),
  }));

  return { ok: true, records, galleryIdsBySnapshotId };
}

export function enrichGalleryEntriesWithSnapshotOwnership<
  T extends {
    galleryId: string | null;
    ownerType: string | null;
    ownerId: string | null;
  },
>(entries: T[], galleryIdsBySnapshotId: Map<string, Set<string>>): T[] {
  if (galleryIdsBySnapshotId.size === 0) {
    return entries;
  }

  const galleryToSnapshot = new Map<string, string>();

  for (const [snapshotId, galleryIds] of galleryIdsBySnapshotId) {
    for (const galleryId of galleryIds) {
      galleryToSnapshot.set(galleryId, snapshotId);
    }
  }

  return entries.map((entry) => {
    if (entry.ownerType !== null || !entry.galleryId) {
      return entry;
    }

    const snapshotId = galleryToSnapshot.get(entry.galleryId);
    if (!snapshotId) {
      return entry;
    }

    return {
      ...entry,
      ownerType: SNAPSHOT_EVIDENCE_OWNER_TYPE,
      ownerId: snapshotId,
    };
  });
}
