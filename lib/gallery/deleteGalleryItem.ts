/**
 * SINGLE DELETE PIPELINE — all gallery deletions must go through `deleteGalleryItem()`.
 * Storage removal is only performed here (never call storage.remove elsewhere).
 */
import {
  type GalleryLifecyclePatch,
  isMissingColumnError,
  isNotFoundStorageError,
} from "@/lib/gallery/galleryRowMeta";
import type { SupabaseErrorLike } from "@/lib/gallery/supabaseErrors";
import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import { invalidateSignedUrlCache } from "@/lib/gallerySignedUrlCache";
import { invalidateStorageCache } from "@/lib/storageCache";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

export type DeleteGalleryItemInput = {
  /** When null/undefined, storage-only cleanup is attempted. */
  galleryId?: string | null;
  /** Bucket-relative path, e.g. userId/homeId/file.jpg */
  filePath: string;
  userId: string;
  homeId: string;
};

export type DeleteGalleryItemResult =
  | { ok: true }
  | { ok: false; message: string };

const inFlightDeletes = new Set<string>();

function deleteLockKey(userId: string, filePath: string, galleryId?: string | null): string {
  return `${userId}:${galleryId ?? ""}:${filePath}`;
}

async function tryUpdateGalleryRow(
  galleryId: string,
  userId: string,
  patch: GalleryLifecyclePatch
): Promise<{ ok: true } | { ok: false; skipped: boolean; message?: string }> {
  const { error } = await supabase
    .from("gallery")
    .update({
      ...patch,
      updated_at: patch.updated_at ?? new Date().toISOString(),
    })
    .eq("id", galleryId)
    .eq("user_id", userId);

  if (!error) {
    return { ok: true };
  }

  if (isMissingColumnError(error as SupabaseErrorLike)) {
    return { ok: false, skipped: true, message: error.message };
  }

  console.error("[gallery] update row", error);
  return { ok: false, skipped: false, message: error.message };
}

async function markGalleryDeleting(
  galleryId: string,
  userId: string
): Promise<{ locked: boolean }> {
  const result = await tryUpdateGalleryRow(galleryId, userId, {
    is_deleting: true,
  });

  if (result.ok) {
    return { locked: true };
  }

  if (result.skipped) {
    return { locked: false };
  }

  throw new Error(result.message || "Could not mark gallery row as deleting.");
}

async function clearGalleryDeleting(
  galleryId: string,
  userId: string
): Promise<void> {
  await tryUpdateGalleryRow(galleryId, userId, { is_deleting: false });
}

async function markGalleryReconciliationState(
  galleryId: string,
  userId: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const fullPatch: GalleryLifecyclePatch = {
    is_deleted: true,
    is_deleting: false,
    storage_missing: true,
    deleted_at: timestamp,
  };

  const full = await tryUpdateGalleryRow(galleryId, userId, fullPatch);
  if (full.ok) {
    return;
  }

  if (full.skipped) {
    await tryUpdateGalleryRow(galleryId, userId, {
      is_deleted: true,
      updated_at: timestamp,
    });
    return;
  }

  throw new Error(
    full.message || "Could not mark gallery row for reconciliation."
  );
}

async function removeGalleryStorageObject(
  filePath: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = filePath.trim();
  if (!normalized) {
    return { ok: true };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([normalized]);

  if (!error) {
    return { ok: true };
  }

  if (isNotFoundStorageError(error as SupabaseErrorLike)) {
    return { ok: true };
  }

  console.error("[gallery] storage remove", error);
  return {
    ok: false,
    message: error.message || "Could not delete file from storage.",
  };
}

async function fetchGalleryStoragePath(
  galleryId: string,
  userId: string,
  homeId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("gallery")
    .select("storage_path")
    .eq("id", galleryId)
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .maybeSingle();

  if (error) {
    console.error("[gallery] fetch storage_path before delete", error);
    return null;
  }

  const path = (data as { storage_path?: string } | null)?.storage_path?.trim();
  return path || null;
}

async function countOtherGalleryRowsForStoragePath(
  storagePath: string,
  userId: string,
  homeId: string,
  excludeGalleryId: string | null
): Promise<number> {
  const normalized = storagePath.trim();
  if (!normalized) {
    return 0;
  }

  let query = supabase
    .from("gallery")
    .select("id", { count: "exact", head: true })
    .eq("storage_path", normalized)
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (excludeGalleryId) {
    query = query.neq("id", excludeGalleryId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[gallery] count gallery rows for storage_path", error);
    return 1;
  }

  return count ?? 0;
}

/**
 * Cleans up attachment rows when no remaining gallery row references storage_path
 * (e.g. after copy-to-folder soft duplicates). Gallery ownership is the lifecycle
 * authority; attachments cleanup is best-effort and non-blocking.
 */
async function deleteAttachmentsIfNoGalleryReferences(
  storagePath: string,
  userId: string,
  homeId: string,
  excludeGalleryId: string | null
): Promise<void> {
  const normalized = storagePath.trim();
  if (!normalized) {
    return;
  }

  const remainingGalleryRows = await countOtherGalleryRowsForStoragePath(
    normalized,
    userId,
    homeId,
    excludeGalleryId
  );

  if (remainingGalleryRows > 0) {
    return;
  }

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("storage_path", normalized)
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[gallery] attachment cleanup on delete", error);
  }
}

async function deleteGalleryRow(
  galleryId: string,
  userId: string
): Promise<
  | { ok: true; deleted: true }
  | { ok: true; deleted: false }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("gallery")
    .delete()
    .eq("id", galleryId)
    .eq("user_id", userId)
    .select("id");

  if (!error) {
    return { ok: true, deleted: (data?.length ?? 0) > 0 };
  }

  console.error("[gallery] delete row", error);
  return {
    ok: false,
    message: error.message || "Could not delete gallery record.",
  };
}

function invalidateGalleryCaches(userId: string, homeId: string): void {
  invalidateStorageCache(userId, homeId);
  invalidateSignedUrlCache(userId, homeId);
  invalidateDashboardSnapshot(userId, homeId);
}

/**
 * Production-safe gallery delete (storage-first with DB reconciliation fallback).
 */
export async function deleteGalleryItem(
  input: DeleteGalleryItemInput
): Promise<DeleteGalleryItemResult> {
  const userId = input.userId.trim();
  const homeId = input.homeId.trim();
  const filePath = input.filePath.trim();
  const galleryId = input.galleryId?.trim() || null;

  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  if (!homeId) {
    return { ok: false, message: "No active home selected." };
  }

  if (!filePath && !galleryId) {
    return { ok: false, message: "Nothing to delete." };
  }

  const lockKey = deleteLockKey(userId, filePath, galleryId);
  if (inFlightDeletes.has(lockKey)) {
    return { ok: true };
  }

  inFlightDeletes.add(lockKey);

  let storagePathForAttachments = filePath || null;
  if (galleryId) {
    const fetchedPath = await fetchGalleryStoragePath(galleryId, userId, homeId);
    if (fetchedPath) {
      storagePathForAttachments = fetchedPath;
    }
  }

  const cleanupAttachments = async (excludeGalleryId: string | null) => {
    if (!storagePathForAttachments) {
      return;
    }
    await deleteAttachmentsIfNoGalleryReferences(
      storagePathForAttachments,
      userId,
      homeId,
      excludeGalleryId
    );
  };

  try {
    if (galleryId) {
      try {
        await markGalleryDeleting(galleryId, userId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not prepare delete.";
        return { ok: false, message };
      }
    }

    if (filePath) {
      const storageResult = await removeGalleryStorageObject(filePath);
      if (!storageResult.ok) {
        if (galleryId) {
          await clearGalleryDeleting(galleryId, userId);
        }
        return { ok: false, message: storageResult.message };
      }
    }

    if (!galleryId) {
      await cleanupAttachments(null);
      invalidateGalleryCaches(userId, homeId);
      return { ok: true };
    }

    const dbResult = await deleteGalleryRow(galleryId, userId);
    if (!dbResult.ok) {
      try {
        await markGalleryReconciliationState(galleryId, userId);
      } catch (reconcileErr) {
        console.error("[gallery] reconciliation mark failed", reconcileErr);
        return {
          ok: false,
          message:
            dbResult.message ||
            "File removed from storage but gallery metadata could not be updated.",
        };
      }

      await cleanupAttachments(galleryId);
      invalidateGalleryCaches(userId, homeId);
      return { ok: true };
    }

    if (!dbResult.deleted) {
      await cleanupAttachments(galleryId);
      invalidateGalleryCaches(userId, homeId);
      return { ok: true };
    }

    await cleanupAttachments(null);
    invalidateGalleryCaches(userId, homeId);
    return { ok: true };
  } finally {
    inFlightDeletes.delete(lockKey);
  }
}
