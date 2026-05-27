import type { GalleryItem } from "@/lib/gallery/types";

export type GalleryDisplayEntry = {
  path: string;
  name: string;
  galleryId: string | null;
  ownerType: string | null;
  ownerId: string | null;
  folderId: string | null;
};

function fileNameFromPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function isVisibleGalleryRow(item: GalleryItem): boolean {
  if (!item.storage_path || item.is_deleted) {
    return false;
  }

  const lifecycle = item as GalleryItem & {
    is_deleting?: boolean;
    storage_missing?: boolean;
  };

  return !lifecycle.is_deleting && !lifecycle.storage_missing;
}

/**
 * Derives UI entries from storage paths (physical) enriched with gallery metadata.
 */
export function buildGalleryDisplayEntriesFromPaths(
  storagePaths: string[],
  galleryItems: GalleryItem[]
): GalleryDisplayEntry[] {
  const byPath = new Map<string, GalleryItem>();

  for (const item of galleryItems) {
    if (!isVisibleGalleryRow(item)) {
      continue;
    }
    byPath.set(item.storage_path, item);
  }

  return storagePaths.map((path) => {
    const row = byPath.get(path);
    return {
      path,
      name: fileNameFromPath(path),
      galleryId: row?.id ?? null,
      ownerType: row?.owner_type ?? null,
      ownerId: row?.owner_id ?? null,
      folderId: row?.folder_id ?? null,
    };
  });
}
