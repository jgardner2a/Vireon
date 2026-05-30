/**
 * Gallery + evidence-log upload pipeline (`uploadFilesToGallery`).
 *
 * Used by: Gallery page, Maintenance, Notes, Communications, Complex.
 * NOT used by: Snapshots — move-in/move-out media uses `uploadSnapshotImage()`
 * in lib/snapshots/uploadSnapshotImage.ts (same `uploads` bucket + `gallery` table).
 *
 * Deletions use `deleteGalleryItem()` in lib/gallery/deleteGalleryItem.ts only.
 */
import {
  GALLERY_OWNER_TYPE_COMMUNICATION,
  GALLERY_OWNER_TYPE_COMPLEX,
  GALLERY_OWNER_TYPE_MAINTENANCE,
  GALLERY_OWNER_TYPE_NOTE,
} from "@/lib/gallery/types";
import { safeGalleryFileName } from "@/lib/gallery/safeFileName";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import { invalidateStorageCache } from "@/lib/storageCache";
import { supabase } from "@/lib/supabaseClient";

export type UploadGalleryContext =
  | "gallery"
  | "maintenance"
  | "note"
  | "communication"
  | "complex";

export type UploadFilesToGalleryInput = {
  userId: string;
  homeId: string;
  files: File[];
  logContext: string;
  /** Drives owner_type; use "gallery" for unlinked uploads. */
  context: UploadGalleryContext;
  /** Record id when context is maintenance, note, communication, or complex. */
  ownerId?: string;
  /** Optional folder_id; no folder creation logic here. */
  folderId?: string;
};

/** context → owner_type; owner_id only when context is not "gallery". */
function resolveOwnerFields(
  context: UploadGalleryContext,
  ownerId: string | undefined
): { owner_type: string | null; owner_id: string | null } {
  if (context === "gallery") {
    return { owner_type: null, owner_id: null };
  }

  const owner_type =
    context === "maintenance"
      ? GALLERY_OWNER_TYPE_MAINTENANCE
      : context === "note"
        ? GALLERY_OWNER_TYPE_NOTE
        : context === "complex"
          ? GALLERY_OWNER_TYPE_COMPLEX
          : GALLERY_OWNER_TYPE_COMMUNICATION;

  return {
    owner_type,
    owner_id: ownerId ?? null,
  };
}

function buildGalleryInsertRow(
  input: UploadFilesToGalleryInput,
  path: string,
  fileName: string,
  file: File,
  timestamp: string
) {
  const owner = resolveOwnerFields(input.context, input.ownerId);

  return {
    user_id: input.userId,
    home_id: input.homeId,
    storage_path: path,
    created_at: timestamp,
    updated_at: timestamp,
    file_name: fileName,
    file_type: file.type.startsWith("image/") ? "image" : "file",
    file_size: file.size,
    mime_type: file.type || "image/jpeg",
    folder_id: input.folderId ?? null,
    owner_type: owner.owner_type,
    owner_id: owner.owner_id,
  };
}

/**
 * Upload → storage → gallery insert (single pipeline; metadata enriched on insert only).
 */
export async function uploadFilesToGallery(
  input: UploadFilesToGalleryInput
): Promise<
  { ok: true; storagePaths: string[] } | { ok: false; message: string }
> {
  const imageFiles = input.files.filter((file) =>
    file.type.startsWith("image/")
  );

  if (imageFiles.length === 0) {
    return { ok: true, storagePaths: [] };
  }

  const storagePaths: string[] = [];

  for (const file of imageFiles) {
    const fileName = safeGalleryFileName(file.name);
    const path = storagePath(input.userId, input.homeId, fileName);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error(`[${input.logContext}] storage upload`, uploadError);
      return {
        ok: false,
        message: uploadError.message || "Could not upload image.",
      };
    }

    const timestamp = new Date().toISOString();
    const row = buildGalleryInsertRow(input, path, fileName, file, timestamp);

    const { error: insertError } = await supabase.from("gallery").insert(row);

    if (insertError) {
      console.error(`[${input.logContext}] gallery insert`, insertError);
      return {
        ok: false,
        message: insertError.message || "Could not save gallery record.",
      };
    }

    storagePaths.push(path);
  }

  invalidateStorageCache(input.userId, input.homeId);

  return { ok: true, storagePaths };
}
