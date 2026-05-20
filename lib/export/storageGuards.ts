/**
 * Export must use original gallery assets only (bucket `gallery`, column `storage_path`).
 * Generated thumbnails (`gallery-thumbnails`, `thumbnail_path`) are UI-only.
 */

export const EXPORT_ORIGINAL_GALLERY_BUCKET = "gallery";

const FORBIDDEN_BUCKET_FRAGMENTS = ["gallery-thumbnails"] as const;

/**
 * Rejects paths that belong to the thumbnails bucket or match thumbnail object layout.
 * Original layout: `{profileId}/{propertyId}/{mediaId}/{fileName}` (4+ segments).
 * Thumbnail layout: `{profileId}/{propertyId}/{mediaId}.webp` (3 segments).
 */
export function assertExportUsesOriginalStoragePath(storagePath: string): void {
  const path = storagePath.trim();
  if (!path) {
    throw new Error("Export requires a non-empty storage_path.");
  }

  for (const fragment of FORBIDDEN_BUCKET_FRAGMENTS) {
    if (path.includes(fragment)) {
      throw new Error(
        `Export cannot reference thumbnails bucket (${fragment}).`
      );
    }
  }

  const segments = path.split("/").filter(Boolean);
  if (
    segments.length === 3 &&
    segments[2].toLowerCase().endsWith(".webp")
  ) {
    throw new Error(
      "Export cannot use thumbnail storage path; use gallery storage_path only."
    );
  }
}

export function assertExportGalleryBucket(bucket: string): void {
  if (bucket !== EXPORT_ORIGINAL_GALLERY_BUCKET) {
    throw new Error(
      `Export storage access is limited to bucket "${EXPORT_ORIGINAL_GALLERY_BUCKET}".`
    );
  }
}
