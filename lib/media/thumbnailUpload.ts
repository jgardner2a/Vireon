import { uploadThumbnailFile } from "@/lib/data/thumbnailStorage";

export type UploadThumbnailResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

/**
 * Uploads a thumbnail blob to the `gallery-thumbnails` bucket.
 * Does not touch original gallery media upload flow.
 */
export async function uploadThumbnail(
  file: Blob,
  path: string
): Promise<UploadThumbnailResult> {
  const storagePath = path.trim();
  if (!storagePath) {
    return { ok: false, message: "Thumbnail path is required." };
  }

  const result = await uploadThumbnailFile(storagePath, file);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true, path: storagePath };
}
