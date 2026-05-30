import { isEvidenceLogImageFile } from "@/lib/attachments/evidenceLogImageFiles";
import {
  formatSnapshotsErrorMessage,
  logSnapshotsSupabase,
} from "@/lib/snapshots/supabaseErrors";
import {
  mapSnapshotImageRow,
  SNAPSHOT_IMAGE_COLUMNS,
} from "@/lib/snapshots/snapshotImageRow";
import { snapshotStorageFileName } from "@/lib/snapshots/snapshotStorageFileName";
import type { SnapshotImage } from "@/lib/snapshots/types";
import { getCachedUserId } from "@/lib/sessionCache";
import { invalidateStorageCache } from "@/lib/storageCache";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

const SNAPSHOT_IMAGE_ONLY_MESSAGE =
  "Snapshot images must be image files (for example JPEG, PNG, or WebP).";

type SnapshotContextRow = {
  id: string;
  home_id: string;
};

function normalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function fetchSnapshotContext(
  snapshotId: string
): Promise<
  { ok: true; snapshot: SnapshotContextRow } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, home_id")
    .eq("id", snapshotId)
    .maybeSingle();

  if (error) {
    logSnapshotsSupabase("upload fetch snapshot", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(error, "Could not load snapshot."),
    };
  }

  if (!data) {
    return { ok: false, message: "Snapshot not found." };
  }

  return { ok: true, snapshot: data as SnapshotContextRow };
}

async function fetchNextOrderIndex(snapshotId: string): Promise<number> {
  const { data, error } = await supabase
    .from("snapshot_images")
    .select("order_index")
    .eq("snapshot_id", snapshotId);

  if (error) {
    console.error("[snapshots] upload fetch order_index", error);
    return 0;
  }

  let max = -1;
  for (const row of data ?? []) {
    const value = (row as { order_index: number | null }).order_index;
    if (typeof value === "number" && value > max) {
      max = value;
    }
  }

  return max + 1;
}

async function removeStorageObject(path: string): Promise<void> {
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

/**
 * Snapshot creation layer for move-in/move-out media.
 *
 * Flow: snapshot page → `uploads` storage → `gallery` insert → `snapshot_images` link.
 *
 * Gallery is the DB/index layer (same `gallery` schema as catalog uploads).
 * Do NOT import `uploadFilesToGallery`, Gallery page code, or other gallery upload helpers.
 */
export async function uploadSnapshotImage(
  snapshotId: string,
  file: File,
  room?: string
): Promise<
  { ok: true; image: SnapshotImage; galleryId: string } | { ok: false; message: string }
> {
  if (!isEvidenceLogImageFile(file)) {
    return { ok: false, message: SNAPSHOT_IMAGE_ONLY_MESSAGE };
  }

  const contextResult = await fetchSnapshotContext(snapshotId);
  if (!contextResult.ok) {
    return contextResult;
  }

  const userId = await getCachedUserId();
  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  const { snapshot } = contextResult;
  const fileName = snapshotStorageFileName(file.name);
  const path = storagePath(userId, snapshot.home_id, fileName);
  const timestamp = new Date().toISOString();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    logSnapshotsSupabase("upload storage", uploadError);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        uploadError,
        "Could not upload image."
      ),
    };
  }

  const { data: galleryRow, error: galleryError } = await supabase
    .from("gallery")
    .insert({
      user_id: userId,
      home_id: snapshot.home_id,
      storage_path: path,
      created_at: timestamp,
      updated_at: timestamp,
      file_name: fileName,
      file_type: file.type.startsWith("image/") ? "image" : "file",
      file_size: file.size,
      mime_type: file.type || "image/jpeg",
      folder_id: null,
      owner_type: null,
      owner_id: null,
    })
    .select("id")
    .single();

  if (galleryError || !galleryRow) {
    logSnapshotsSupabase("upload gallery insert", galleryError);
    await removeStorageObject(path);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        galleryError,
        "Could not save gallery record."
      ),
    };
  }

  const galleryId = String((galleryRow as { id: string }).id);
  const orderIndex = await fetchNextOrderIndex(snapshotId);
  const roomValue = normalizeOptionalText(room);

  const { data: snapshotImageRow, error: linkError } = await supabase
    .from("snapshot_images")
    .insert({
      snapshot_id: snapshotId,
      gallery_id: galleryId,
      room: roomValue,
      order_index: orderIndex,
    })
    .select(SNAPSHOT_IMAGE_COLUMNS)
    .single();

  if (linkError || !snapshotImageRow) {
    logSnapshotsSupabase("upload snapshot_images insert", linkError);
    await supabase.from("gallery").delete().eq("id", galleryId);
    await removeStorageObject(path);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        linkError,
        "Could not link image to snapshot."
      ),
    };
  }

  invalidateStorageCache(userId, snapshot.home_id);

  return {
    ok: true,
    image: mapSnapshotImageRow(snapshotImageRow),
    galleryId,
  };
}
