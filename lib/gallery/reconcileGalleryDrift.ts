import { fetchGalleryItemsForHome } from "@/lib/gallery/galleryRecords";
import type { GalleryItem } from "@/lib/gallery/types";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

export type OrphanStorageItem = {
  path: string;
  fileName: string;
};

export type OrphanDbItem = {
  id: string;
  storage_path: string;
};

export type GalleryDriftReport = {
  orphan_storage: OrphanStorageItem[];
  orphan_db: OrphanDbItem[];
};

export type ReconcileGalleryDriftResult =
  | { ok: true; report: GalleryDriftReport }
  | { ok: false; message: string };

const LIST_LIMIT = 1000;

function fileNameFromPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function isActiveGalleryRow(row: GalleryItem): boolean {
  if (row.is_deleted) {
    return false;
  }

  const lifecycle = row as GalleryItem & {
    is_deleting?: boolean;
    storage_missing?: boolean;
  };

  if (lifecycle.is_deleting) {
    return false;
  }

  if (lifecycle.storage_missing) {
    return false;
  }

  return true;
}

/**
 * Detects storage ↔ gallery metadata drift. Does not mutate data.
 * Storage is physical truth; gallery rows are metadata truth.
 */
export async function reconcileGalleryDrift(
  userId: string,
  homeId: string
): Promise<ReconcileGalleryDriftResult> {
  const uid = userId.trim();
  const hid = homeId.trim();

  if (!uid || !hid) {
    return { ok: false, message: "userId and homeId are required." };
  }

  const [listResult, galleryResult] = await Promise.all([
    supabase.storage
      .from(STORAGE_BUCKET)
      .list(storagePath(uid, hid), { limit: LIST_LIMIT }),
    fetchGalleryItemsForHome(uid, hid, { includeInactive: true }),
  ]);

  if (listResult.error) {
    console.error("[gallery] drift storage list", listResult.error);
    return {
      ok: false,
      message:
        listResult.error.message || "Could not list storage for reconciliation.",
    };
  }

  if (!galleryResult.ok) {
    return { ok: false, message: galleryResult.message };
  }

  const storagePaths = new Set<string>();
  for (const item of listResult.data ?? []) {
    if (item.name && item.id !== null) {
      storagePaths.add(storagePath(uid, hid, item.name));
    }
  }

  const dbByPath = new Map<string, GalleryItem>();
  for (const row of galleryResult.items) {
    if (row.storage_path) {
      dbByPath.set(row.storage_path, row);
    }
  }

  const activeDbPaths = new Set<string>();
  for (const row of galleryResult.items) {
    if (isActiveGalleryRow(row) && row.storage_path) {
      activeDbPaths.add(row.storage_path);
    }
  }

  const orphan_storage: OrphanStorageItem[] = [];
  for (const path of storagePaths) {
    if (!activeDbPaths.has(path)) {
      orphan_storage.push({
        path,
        fileName: fileNameFromPath(path),
      });
    }
  }

  const orphan_db: OrphanDbItem[] = [];
  for (const row of galleryResult.items) {
    if (!isActiveGalleryRow(row) || !row.storage_path) {
      continue;
    }
    if (!storagePaths.has(row.storage_path)) {
      orphan_db.push({
        id: row.id,
        storage_path: row.storage_path,
      });
    }
  }

  orphan_storage.sort((a, b) => a.path.localeCompare(b.path));
  orphan_db.sort((a, b) => a.storage_path.localeCompare(b.storage_path));

  return {
    ok: true,
    report: { orphan_storage, orphan_db },
  };
}
