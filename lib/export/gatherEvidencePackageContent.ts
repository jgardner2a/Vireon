import {
  EVIDENCE_MODULE_IDS,
  type EvidenceModuleId,
  type EvidencePackageContent,
  type EvidencePackageImage,
  type EvidencePackageRecord,
  type EvidenceSnapshotIssue,
} from "@/lib/export/types";
import { noteDisplayTitle } from "@/lib/notes/format";
import { snapshotTypeLabel } from "@/lib/snapshots/format";
import { getSnapshot } from "@/lib/snapshots/snapshots";
import type { SnapshotType } from "@/lib/snapshots/types";
import { supabase } from "@/lib/supabaseClient";

type AttachmentRow = {
  id: string;
  owner_type: string;
  owner_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
};

type GalleryPathRow = {
  id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
};

type SnapshotImageJoinRow = {
  id: string;
  snapshot_id: string;
  room: string | null;
  order_index: number | null;
  gallery_id: string;
};

const OWNER_TYPE_BY_MODULE: Record<
  Exclude<EvidenceModuleId, "snapshots">,
  string
> = {
  maintenance: "maintenance",
  complex: "complex",
  communications: "communication",
  notes: "note",
};

function sortByCreatedAtDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function mapAttachment(row: AttachmentRow): EvidencePackageImage {
  return {
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name ?? row.storage_path.split("/").pop() ?? "image",
    mimeType: row.mime_type,
    room: null,
    orderIndex: null,
  };
}

async function fetchAttachmentsForOwners(
  userId: string,
  homeId: string,
  ownerType: string,
  ownerIds: string[]
): Promise<Map<string, EvidencePackageImage[]>> {
  const map = new Map<string, EvidencePackageImage[]>();
  if (ownerIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("attachments")
    .select(
      "id, owner_type, owner_id, storage_path, file_name, mime_type, created_at"
    )
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("owner_type", ownerType)
    .in("owner_id", ownerIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[export] fetch attachments", ownerType, error);
    return map;
  }

  for (const row of (data ?? []) as AttachmentRow[]) {
    const bucket = map.get(row.owner_id) ?? [];
    bucket.push(mapAttachment(row));
    map.set(row.owner_id, bucket);
  }

  return map;
}

async function fetchMaintenanceRecords(
  userId: string,
  homeId: string,
  ids: string[],
  attachmentsByOwner: Map<string, EvidencePackageImage[]>
): Promise<EvidencePackageRecord[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .in("id", ids);

  if (error) {
    console.error("[export] maintenance records", error);
    return [];
  }

  return sortByCreatedAtDesc(data ?? []).map((row) => ({
    moduleId: "maintenance" as const,
    id: String(row.id),
    title: String(row.title),
    status: row.status ? String(row.status) : null,
    category: row.category ? String(row.category) : null,
    detailLabel: row.issue_type ? String(row.issue_type) : null,
    body: String(row.description ?? ""),
    createdAt: String(row.created_at),
    updatedAt: null,
    images: attachmentsByOwner.get(String(row.id)) ?? [],
  }));
}

async function fetchComplexRecords(
  userId: string,
  homeId: string,
  ids: string[],
  attachmentsByOwner: Map<string, EvidencePackageImage[]>
): Promise<EvidencePackageRecord[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("complex_issues")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .in("id", ids);

  if (error) {
    console.error("[export] complex records", error);
    return [];
  }

  return sortByCreatedAtDesc(data ?? []).map((row) => ({
    moduleId: "complex" as const,
    id: String(row.id),
    title: String(row.title),
    status: row.status ? String(row.status) : null,
    category: row.category ? String(row.category) : null,
    detailLabel: row.issue_type ? String(row.issue_type) : null,
    body: String(row.description ?? ""),
    createdAt: String(row.created_at),
    updatedAt: null,
    images: attachmentsByOwner.get(String(row.id)) ?? [],
  }));
}

async function fetchCommunicationRecords(
  userId: string,
  homeId: string,
  ids: string[],
  attachmentsByOwner: Map<string, EvidencePackageImage[]>
): Promise<EvidencePackageRecord[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("apartment_communications")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .in("id", ids);

  if (error) {
    console.error("[export] communication records", error);
    return [];
  }

  return sortByCreatedAtDesc(data ?? []).map((row) => ({
    moduleId: "communications" as const,
    id: String(row.id),
    title: String(row.title),
    status: row.status ? String(row.status) : null,
    category: row.category ? String(row.category) : null,
    detailLabel: null,
    body: String(row.message ?? ""),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    images: attachmentsByOwner.get(String(row.id)) ?? [],
  }));
}

async function fetchNoteRecords(
  userId: string,
  homeId: string,
  ids: string[],
  attachmentsByOwner: Map<string, EvidencePackageImage[]>
): Promise<EvidencePackageRecord[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .in("id", ids);

  if (error) {
    console.error("[export] note records", error);
    return [];
  }

  return sortByCreatedAtDesc(data ?? []).map((row) => ({
    moduleId: "notes" as const,
    id: String(row.id),
    title: noteDisplayTitle(
      row.title ? String(row.title) : null,
      String(row.content ?? "")
    ),
    status: null,
    category: row.category ? String(row.category) : null,
    detailLabel: null,
    body: String(row.content ?? ""),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    images: attachmentsByOwner.get(String(row.id)) ?? [],
  }));
}

async function fetchSnapshotImageMap(
  snapshotIds: string[]
): Promise<Map<string, EvidencePackageImage[]>> {
  const map = new Map<string, EvidencePackageImage[]>();
  if (snapshotIds.length === 0) {
    return map;
  }

  const { data: imageRows, error: imageError } = await supabase
    .from("snapshot_images")
    .select("id, snapshot_id, room, order_index, gallery_id")
    .in("snapshot_id", snapshotIds)
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (imageError) {
    console.error("[export] snapshot images", imageError);
    return map;
  }

  const rows = (imageRows ?? []) as SnapshotImageJoinRow[];
  const galleryIds = [...new Set(rows.map((row) => row.gallery_id))];
  if (galleryIds.length === 0) {
    return map;
  }

  const { data: galleryRows, error: galleryError } = await supabase
    .from("gallery")
    .select("id, storage_path, file_name, mime_type")
    .in("id", galleryIds);

  if (galleryError) {
    console.error("[export] snapshot gallery paths", galleryError);
    return map;
  }

  const galleryById = new Map(
    (galleryRows ?? []).map((row) => [
      String((row as GalleryPathRow).id),
      row as GalleryPathRow,
    ])
  );

  for (const row of rows) {
    const gallery = galleryById.get(row.gallery_id);
    if (!gallery) {
      continue;
    }

    const image: EvidencePackageImage = {
      id: row.id,
      storagePath: gallery.storage_path,
      fileName:
        gallery.file_name ??
        gallery.storage_path.split("/").pop() ??
        "image",
      mimeType: gallery.mime_type,
      room: row.room,
      orderIndex: row.order_index,
    };

    const bucket = map.get(row.snapshot_id) ?? [];
    bucket.push(image);
    map.set(row.snapshot_id, bucket);
  }

  return map;
}

async function fetchSnapshotRecords(
  snapshotIds: string[]
): Promise<EvidencePackageRecord[]> {
  if (snapshotIds.length === 0) {
    return [];
  }

  const imageMap = await fetchSnapshotImageMap(snapshotIds);
  const results = await Promise.all(snapshotIds.map((id) => getSnapshot(id)));

  const records: EvidencePackageRecord[] = [];

  for (const result of results) {
    if (!result.ok) {
      continue;
    }

    const snapshot = result.snapshot;
    const issues: EvidenceSnapshotIssue[] = snapshot.issues.map((issue) => ({
      label: issue.label,
      room: issue.room,
      notes: issue.notes,
      severity: issue.severity,
    }));

    const issueSummary =
      issues.length === 0
        ? "No separate issues were logged for this snapshot."
        : issues
            .map((issue) => {
              const parts = [issue.label];
              if (issue.room) {
                parts.push(`Room: ${issue.room}`);
              }
              if (issue.severity) {
                parts.push(`Severity: ${issue.severity}`);
              }
              if (issue.notes) {
                parts.push(issue.notes);
              }
              return parts.join(" — ");
            })
            .join("\n");

    records.push({
      moduleId: "snapshots",
      id: snapshot.id,
      title: snapshotTypeLabel(snapshot.type),
      status: null,
      category: null,
      detailLabel: null,
      body: issueSummary,
      createdAt: snapshot.created_at,
      updatedAt: null,
      images: imageMap.get(snapshot.id) ?? [],
      snapshotType: snapshot.type as SnapshotType,
      snapshotIssues: issues,
    });
  }

  return records.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function gatherEvidencePackageContent(input: {
  userId: string;
  homeId: string;
  homeName: string;
  homeAddress: string;
  exporterEmail: string | null;
  selectedIds: Record<EvidenceModuleId, string[]>;
}): Promise<
  { ok: true; content: EvidencePackageContent } | { ok: false; message: string }
> {
  const { userId, homeId, selectedIds } = input;

  const attachmentFetches = await Promise.all(
    (Object.keys(OWNER_TYPE_BY_MODULE) as Exclude<EvidenceModuleId, "snapshots">[]).map(
      async (moduleId) => {
        const ownerType = OWNER_TYPE_BY_MODULE[moduleId];
        const ids = selectedIds[moduleId];
        const attachments = await fetchAttachmentsForOwners(
          userId,
          homeId,
          ownerType,
          ids
        );
        return { moduleId, attachments };
      }
    )
  );

  const attachmentsByModule = Object.fromEntries(
    attachmentFetches.map((entry) => [entry.moduleId, entry.attachments])
  ) as Record<
    Exclude<EvidenceModuleId, "snapshots">,
    Map<string, EvidencePackageImage[]>
  >;

  const [maintenance, complex, communications, notes, snapshots] =
    await Promise.all([
      fetchMaintenanceRecords(
        userId,
        homeId,
        selectedIds.maintenance,
        attachmentsByModule.maintenance
      ),
      fetchComplexRecords(
        userId,
        homeId,
        selectedIds.complex,
        attachmentsByModule.complex
      ),
      fetchCommunicationRecords(
        userId,
        homeId,
        selectedIds.communications,
        attachmentsByModule.communications
      ),
      fetchNoteRecords(
        userId,
        homeId,
        selectedIds.notes,
        attachmentsByModule.notes
      ),
      fetchSnapshotRecords(selectedIds.snapshots),
    ]);

  const recordsByModule: Record<EvidenceModuleId, EvidencePackageRecord[]> = {
    maintenance,
    complex,
    communications,
    notes,
    snapshots,
  };

  const records = EVIDENCE_MODULE_IDS.flatMap(
    (moduleId) => recordsByModule[moduleId]
  );

  if (records.length === 0) {
    return { ok: false, message: "No records selected for export." };
  }

  return {
    ok: true,
    content: {
      property: {
        homeId,
        name: input.homeName,
        address: input.homeAddress,
      },
      exportedAt: new Date().toISOString(),
      exporterEmail: input.exporterEmail,
      records,
    },
  };
}
