import { fetchCommunications } from "@/lib/communications/communications";
import { fetchComplexIssuesForHome } from "@/lib/complex/complexIssues";
import {
  EVIDENCE_MODULE_IDS,
  EVIDENCE_MODULE_LABELS,
  type EvidenceExportItem,
  type EvidenceExportSection,
  type EvidenceInventory,
  type EvidenceModuleId,
} from "@/lib/export/types";
import { formatLogDate } from "@/lib/maintenance/format";
import { fetchMaintenanceLogsForHome } from "@/lib/maintenance/maintenanceLogs";
import { noteDisplayTitle, formatNoteDate } from "@/lib/notes/format";
import { fetchNotes } from "@/lib/notes/notes";
import { formatSnapshotDate, snapshotTypeLabel } from "@/lib/snapshots/format";
import { getSnapshots } from "@/lib/snapshots/snapshots";
import { supabase } from "@/lib/supabaseClient";

type AttachmentCountRow = {
  owner_type: string;
  owner_id: string;
};

type SnapshotImageCountRow = {
  snapshot_id: string;
};

function attachmentKey(ownerType: string, ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}

function formatItemDetail(
  parts: Array<string | null | undefined>
): string {
  return parts.filter((part) => part && part.trim()).join(" · ");
}

function formatImageCount(count: number): string {
  if (count === 0) {
    return "No images";
  }
  return count === 1 ? "1 image" : `${count} images`;
}

async function fetchAttachmentCounts(
  userId: string,
  homeId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("attachments")
    .select("owner_type, owner_id")
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[export] attachment counts", error);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as AttachmentCountRow[]) {
    const key = attachmentKey(row.owner_type, row.owner_id);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

async function fetchSnapshotImageCounts(
  snapshotIds: string[]
): Promise<Map<string, number>> {
  if (snapshotIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("snapshot_images")
    .select("snapshot_id")
    .in("snapshot_id", snapshotIds);

  if (error) {
    console.error("[export] snapshot image counts", error);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as SnapshotImageCountRow[]) {
    map.set(row.snapshot_id, (map.get(row.snapshot_id) ?? 0) + 1);
  }
  return map;
}

function getAttachmentCount(
  counts: Map<string, number>,
  ownerType: string,
  ownerId: string
): number {
  return counts.get(attachmentKey(ownerType, ownerId)) ?? 0;
}

export async function gatherEvidenceInventory(
  userId: string,
  homeId: string
): Promise<
  { ok: true; inventory: EvidenceInventory } | { ok: false; message: string }
> {
  const [
    maintenanceResult,
    complexResult,
    communicationsResult,
    notesResult,
    snapshotsResult,
    attachmentCounts,
  ] = await Promise.all([
    fetchMaintenanceLogsForHome(userId, homeId),
    fetchComplexIssuesForHome(userId, homeId),
    fetchCommunications(userId, homeId),
    fetchNotes(userId, homeId),
    getSnapshots(homeId),
    fetchAttachmentCounts(userId, homeId),
  ]);

  if (!maintenanceResult.ok) {
    return maintenanceResult;
  }
  if (!complexResult.ok) {
    return complexResult;
  }
  if (!communicationsResult.ok) {
    return communicationsResult;
  }
  if (!notesResult.ok) {
    return notesResult;
  }
  if (!snapshotsResult.ok) {
    return snapshotsResult;
  }

  const snapshotIds = snapshotsResult.snapshots.map((snapshot) => snapshot.id);
  const snapshotImageCounts = await fetchSnapshotImageCounts(snapshotIds);

  const sectionItems: Record<EvidenceModuleId, EvidenceExportItem[]> = {
    maintenance: maintenanceResult.logs.map((log) => {
      const imageCount = getAttachmentCount(
        attachmentCounts,
        "maintenance",
        log.id
      );
      return {
        id: log.id,
        title: log.title,
        detail: formatItemDetail([
          log.status,
          formatLogDate(log.created_at),
          formatImageCount(imageCount),
        ]),
        imageCount,
        createdAt: log.created_at,
      };
    }),
    complex: complexResult.issues.map((issue) => {
      const imageCount = getAttachmentCount(
        attachmentCounts,
        "complex",
        issue.id
      );
      return {
        id: issue.id,
        title: issue.title,
        detail: formatItemDetail([
          issue.status,
          formatLogDate(issue.created_at),
          formatImageCount(imageCount),
        ]),
        imageCount,
        createdAt: issue.created_at,
      };
    }),
    communications: communicationsResult.communications.map((communication) => {
      const imageCount = getAttachmentCount(
        attachmentCounts,
        "communication",
        communication.id
      );
      return {
        id: communication.id,
        title: communication.title,
        detail: formatItemDetail([
          communication.status,
          formatLogDate(communication.created_at),
          formatImageCount(imageCount),
        ]),
        imageCount,
        createdAt: communication.created_at,
      };
    }),
    notes: notesResult.notes.map((note) => {
      const imageCount = getAttachmentCount(attachmentCounts, "note", note.id);
      return {
        id: note.id,
        title: noteDisplayTitle(note.title, note.content),
        detail: formatItemDetail([
          note.category,
          formatNoteDate(note.created_at),
          formatImageCount(imageCount),
        ]),
        imageCount,
        createdAt: note.created_at,
      };
    }),
    snapshots: snapshotsResult.snapshots.map((snapshot) => {
      const imageCount = snapshotImageCounts.get(snapshot.id) ?? 0;
      return {
        id: snapshot.id,
        title: snapshotTypeLabel(snapshot.type),
        detail: formatItemDetail([
          formatSnapshotDate(snapshot.created_at),
          formatImageCount(imageCount),
        ]),
        imageCount,
        createdAt: snapshot.created_at,
      };
    }),
  };

  const sections: EvidenceExportSection[] = EVIDENCE_MODULE_IDS.map(
    (moduleId) => ({
      moduleId,
      label: EVIDENCE_MODULE_LABELS[moduleId],
      items: sectionItems[moduleId],
    })
  );

  return { ok: true, inventory: { sections } };
}
