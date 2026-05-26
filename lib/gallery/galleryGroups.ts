import { noteDisplayTitle } from "@/lib/notes/format";
import { supabase } from "@/lib/supabaseClient";

export const GALLERY_OWNER_TYPE_MAINTENANCE = "maintenance";
export const GALLERY_OWNER_TYPE_NOTE = "note";
export const GALLERY_OWNER_TYPE_COMMUNICATION = "communication";

export type GalleryGroupRow = {
  storage_path: string;
  owner_type: string;
  owner_id: string;
};

export type GalleryGroupItem = {
  key: string;
  ownerType: string;
  ownerId: string;
  label: string;
};

export type GalleryGroupSection = {
  ownerType: string;
  title: string;
  items: GalleryGroupItem[];
};

type GalleryIndexRow = {
  storage_path: string;
  owner_type: string;
  owner_id: string;
};

function fileNameFromStoragePath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function groupKey(ownerType: string, ownerId: string): string {
  return `${ownerType}:${ownerId}`;
}

async function fetchMaintenanceTitles(
  userId: string,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.error("[gallery] maintenance labels", error);
    return map;
  }

  for (const row of data ?? []) {
    const r = row as { id: string; title: string };
    map.set(r.id, r.title?.trim() || "Untitled");
  }
  return map;
}

async function fetchNoteTitles(
  userId: string,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.error("[gallery] note labels", error);
    return map;
  }

  for (const row of data ?? []) {
    const r = row as { id: string; title: string | null; content: string };
    map.set(r.id, noteDisplayTitle(r.title, r.content || "") || "Untitled");
  }
  return map;
}

async function fetchCommunicationTitles(
  userId: string,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("apartment_communications")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.error("[gallery] communication labels", error);
    return map;
  }

  for (const row of data ?? []) {
    const r = row as { id: string; title: string };
    map.set(r.id, r.title?.trim() || "Untitled");
  }
  return map;
}

export async function fetchGalleryGroupIndex(
  userId: string,
  homeId: string
): Promise<
  { ok: true; rows: GalleryGroupRow[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("gallery")
    .select("storage_path, owner_type, owner_id")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("is_deleted", false)
    .not("owner_type", "is", null)
    .not("owner_id", "is", null);

  if (error) {
    console.error("[gallery] group index", error);
    return { ok: false, message: error.message || "Could not load groups." };
  }

  const rows = (data ?? []).map((row) => {
    const r = row as GalleryIndexRow;
    return {
      storage_path: r.storage_path,
      owner_type: r.owner_type,
      owner_id: r.owner_id,
    };
  });

  return { ok: true, rows };
}

export async function buildGalleryGroupSections(
  userId: string,
  rows: GalleryGroupRow[]
): Promise<GalleryGroupSection[]> {
  const byType = new Map<string, Set<string>>();

  for (const row of rows) {
    const ownerType = row.owner_type?.trim();
    const ownerId = row.owner_id?.trim();
    if (!ownerType || !ownerId) continue;

    if (!byType.has(ownerType)) byType.set(ownerType, new Set());
    byType.get(ownerType)!.add(ownerId);
  }

  const maintenanceIds = [...(byType.get(GALLERY_OWNER_TYPE_MAINTENANCE) ?? [])];
  const noteIds = [...(byType.get(GALLERY_OWNER_TYPE_NOTE) ?? [])];
  const communicationIds = [...(byType.get(GALLERY_OWNER_TYPE_COMMUNICATION) ?? [])];

  const [maintenanceLabels, noteLabels, communicationLabels] =
    await Promise.all([
      fetchMaintenanceTitles(userId, maintenanceIds),
      fetchNoteTitles(userId, noteIds),
      fetchCommunicationTitles(userId, communicationIds),
    ]);

  const sectionDefs = [
    { ownerType: GALLERY_OWNER_TYPE_MAINTENANCE, title: "Maintenance" },
    { ownerType: GALLERY_OWNER_TYPE_NOTE, title: "Notes" },
    { ownerType: GALLERY_OWNER_TYPE_COMMUNICATION, title: "Communications" },
  ];

  const labelMaps = new Map<string, Map<string, string>>([
    [GALLERY_OWNER_TYPE_MAINTENANCE, maintenanceLabels],
    [GALLERY_OWNER_TYPE_NOTE, noteLabels],
    [GALLERY_OWNER_TYPE_COMMUNICATION, communicationLabels],
  ]);

  return sectionDefs.map(({ ownerType, title }) => {
    const ids = [...(byType.get(ownerType) ?? [])];
    const labels = labelMaps.get(ownerType) ?? new Map();

    const items: GalleryGroupItem[] = ids
      .map((ownerId) => ({
        key: groupKey(ownerType, ownerId),
        ownerType,
        ownerId,
        label: labels.get(ownerId) ?? "Untitled",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { ownerType, title, items };
  });
}

export function buildMatchingFileNames(
  rows: GalleryGroupRow[],
  filter: { ownerType: string; ownerId: string } | null
): Set<string> | null {
  if (!filter) return null;

  const names = new Set<string>();
  for (const row of rows) {
    if (
      row.owner_type === filter.ownerType &&
      row.owner_id === filter.ownerId &&
      row.storage_path
    ) {
      names.add(fileNameFromStoragePath(row.storage_path));
    }
  }
  return names;
}
