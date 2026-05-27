import {
  GALLERY_OWNER_TYPE_COMMUNICATION,
  GALLERY_OWNER_TYPE_MAINTENANCE,
  GALLERY_OWNER_TYPE_NOTE,
  type GalleryItem,
} from "@/lib/gallery/types";
import { supabase } from "@/lib/supabaseClient";

type GalleryRow = {
  id: string;
  user_id: string;
  home_id: string;
  storage_path: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  mime_type: string | null;
  folder_id: string | null;
  owner_type: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  is_deleting?: boolean;
  storage_missing?: boolean;
  deleted_at?: string | null;
};

function mapRow(row: GalleryRow): GalleryItem {
  return {
    id: row.id,
    user_id: row.user_id,
    home_id: row.home_id,
    storage_path: row.storage_path,
    file_name: row.file_name ?? null,
    file_type: row.file_type ?? null,
    file_size: row.file_size ?? null,
    mime_type: row.mime_type ?? null,
    folder_id: row.folder_id ?? null,
    owner_type: row.owner_type ?? null,
    owner_id: row.owner_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    is_deleted: row.is_deleted ?? false,
    is_deleting: row.is_deleting ?? false,
    storage_missing: row.storage_missing ?? false,
    deleted_at: row.deleted_at ?? null,
  };
}

/** Gallery writes happen only in `uploadFilesToGallery` (lib/gallery/uploadStorageFiles.ts). */

export type FetchGalleryItemsOptions = {
  /** Include soft-deleted / reconciliation rows (for drift detection). */
  includeInactive?: boolean;
  /** When set, only rows for this folder (folders table id). */
  folderId?: string;
};

export async function fetchGalleryItemsForHome(
  userId: string,
  homeId: string,
  options?: FetchGalleryItemsOptions
): Promise<
  { ok: true; items: GalleryItem[] } | { ok: false; message: string }
> {
  let query = supabase
    .from("gallery")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (options?.folderId) {
    query = query.eq("folder_id", options.folderId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[gallery] fetch for home", error);
    return { ok: false, message: error.message || "Could not load gallery." };
  }

  let items = (data ?? []).map((row) => mapRow(row as GalleryRow));

  if (!options?.includeInactive) {
    items = items.filter(
      (item) =>
        !item.is_deleted &&
        !item.is_deleting &&
        !item.storage_missing
    );
  }

  return { ok: true, items };
}

/** Gallery deletes happen only in `deleteGalleryItem` (lib/gallery/deleteGalleryItem.ts). */

export async function fetchGalleryItemsForOwner(
  userId: string,
  homeId: string,
  ownerType: string,
  ownerId: string
): Promise<
  { ok: true; items: GalleryItem[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[gallery] fetch by owner", error);
    return { ok: false, message: error.message || "Could not load images." };
  }

  const items = (data ?? []).map((row) => mapRow(row as GalleryRow));

  return {
    ok: true,
    items: items.filter(
      (item) =>
        !item.is_deleted && !item.is_deleting && !item.storage_missing
    ),
  };
}

export async function fetchMaintenanceGalleryItems(
  userId: string,
  homeId: string,
  maintenanceLogId: string
): Promise<
  { ok: true; items: GalleryItem[] } | { ok: false; message: string }
> {
  return fetchGalleryItemsForOwner(
    userId,
    homeId,
    GALLERY_OWNER_TYPE_MAINTENANCE,
    maintenanceLogId
  );
}

export async function fetchNoteGalleryItems(
  userId: string,
  homeId: string,
  noteId: string
): Promise<
  { ok: true; items: GalleryItem[] } | { ok: false; message: string }
> {
  return fetchGalleryItemsForOwner(
    userId,
    homeId,
    GALLERY_OWNER_TYPE_NOTE,
    noteId
  );
}

export async function fetchCommunicationGalleryItems(
  userId: string,
  homeId: string,
  communicationId: string
): Promise<
  { ok: true; items: GalleryItem[] } | { ok: false; message: string }
> {
  return fetchGalleryItemsForOwner(
    userId,
    homeId,
    GALLERY_OWNER_TYPE_COMMUNICATION,
    communicationId
  );
}
