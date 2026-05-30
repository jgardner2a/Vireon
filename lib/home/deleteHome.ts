import { deleteCommunication } from "@/lib/communications/communications";
import { deleteComplexIssue } from "@/lib/complex/complexIssues";
import { invalidateDashboardHomesCache } from "@/lib/dashboard/dashboardContext";
import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import { deleteAllDocumentsForHome } from "@/lib/documents/documents";
import { deleteGalleryItem } from "@/lib/gallery/deleteGalleryItem";
import { fetchGalleryItemsForHome } from "@/lib/gallery/galleryRecords";
import { assertHomeOwnedByUser } from "@/lib/home/assertHomeOwnership";
import { deleteMaintenanceLog } from "@/lib/maintenance/maintenanceLogs";
import { invalidateHomeCache } from "@/lib/sessionCache";
import { deleteNote } from "@/lib/notes/notes";
import { deleteSnapshot, getSnapshots } from "@/lib/snapshots/snapshots";
import { invalidateStorageCache } from "@/lib/storageCache";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

export type DeleteHomeResult =
  | { ok: true }
  | { ok: false; message: string };

async function fetchScopedRecordIds(
  table:
    | "maintenance_logs"
    | "complex_issues"
    | "apartment_communications"
    | "notes",
  userId: string,
  homeId: string
): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error(`[home] fetch ${table} ids`, error);
    return {
      ok: false,
      message: error.message || "Could not prepare property deletion.",
    };
  }

  return {
    ok: true,
    ids: (data ?? []).map((row) => String((row as { id: string }).id)),
  };
}

async function deleteSnapshotsForHome(
  userId: string,
  homeId: string
): Promise<DeleteHomeResult> {
  const snapshotsResult = await getSnapshots(homeId);
  if (!snapshotsResult.ok) {
    return snapshotsResult;
  }

  for (const snapshot of snapshotsResult.snapshots) {
    const { data: imageRows, error: imageError } = await supabase
      .from("snapshot_images")
      .select("gallery_id")
      .eq("snapshot_id", snapshot.id);

    if (imageError) {
      console.error("[home] fetch snapshot images", imageError);
      return {
        ok: false,
        message: imageError.message || "Could not prepare snapshot deletion.",
      };
    }

    const galleryIds = (imageRows ?? []).map((row) =>
      String((row as { gallery_id: string }).gallery_id)
    );

    const { error: issuesError } = await supabase
      .from("snapshot_issues")
      .delete()
      .eq("snapshot_id", snapshot.id);

    if (issuesError) {
      console.error("[home] delete snapshot issues", issuesError);
      return {
        ok: false,
        message: issuesError.message || "Could not delete snapshot issues.",
      };
    }

    const { error: imagesError } = await supabase
      .from("snapshot_images")
      .delete()
      .eq("snapshot_id", snapshot.id);

    if (imagesError) {
      console.error("[home] delete snapshot images", imagesError);
      return {
        ok: false,
        message: imagesError.message || "Could not delete snapshot images.",
      };
    }

    const deletedSnapshot = await deleteSnapshot(snapshot.id);
    if (!deletedSnapshot.ok) {
      return deletedSnapshot;
    }

    if (galleryIds.length === 0) {
      continue;
    }

    const { data: galleryRows, error: galleryError } = await supabase
      .from("gallery")
      .select("id, storage_path")
      .eq("user_id", userId)
      .eq("home_id", homeId)
      .in("id", galleryIds);

    if (galleryError) {
      console.error("[home] fetch snapshot gallery rows", galleryError);
      return {
        ok: false,
        message: galleryError.message || "Could not delete snapshot images.",
      };
    }

    for (const row of galleryRows ?? []) {
      const galleryId = String((row as { id: string }).id);
      const filePath = String((row as { storage_path: string }).storage_path ?? "");
      if (!filePath) {
        continue;
      }

      const result = await deleteGalleryItem({
        galleryId,
        filePath,
        userId,
        homeId,
      });

      if (!result.ok) {
        return result;
      }
    }
  }

  return { ok: true };
}

async function deleteRemainingGalleryForHome(
  userId: string,
  homeId: string
): Promise<DeleteHomeResult> {
  const galleryResult = await fetchGalleryItemsForHome(userId, homeId, {
    includeInactive: true,
  });

  if (!galleryResult.ok) {
    return galleryResult;
  }

  for (const item of galleryResult.items) {
    const result = await deleteGalleryItem({
      galleryId: item.id,
      filePath: item.storage_path,
      userId,
      homeId,
    });

    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}

async function deleteFoldersForHome(
  userId: string,
  homeId: string
): Promise<DeleteHomeResult> {
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[home] delete folders", error);
    return {
      ok: false,
      message: error.message || "Could not delete gallery folders.",
    };
  }

  return { ok: true };
}

async function deleteRemainingAttachmentsForHome(
  userId: string,
  homeId: string
): Promise<DeleteHomeResult> {
  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[home] delete attachments", error);
    return {
      ok: false,
      message: error.message || "Could not delete attachment records.",
    };
  }

  return { ok: true };
}

async function removeRemainingUploadObjects(
  userId: string,
  homeId: string
): Promise<void> {
  const prefix = storagePath(userId, homeId);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(prefix, { limit: 1000 });

  if (error || !data?.length) {
    return;
  }

  const paths = data
    .map((entry) => entry.name)
    .filter(Boolean)
    .map((name) => storagePath(userId, homeId, name));

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    console.error("[home] remove remaining uploads", removeError);
  }
}

async function clearActiveHomePointerIfNeeded(
  userId: string,
  deletedHomeId: string,
  remainingHomeIds: string[]
): Promise<DeleteHomeResult> {
  const { data, error } = await supabase
    .from("user_state")
    .select("current_home_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[home] read user_state", error);
    return {
      ok: false,
      message: error.message || "Could not update active property.",
    };
  }

  if (data?.current_home_id !== deletedHomeId) {
    return { ok: true };
  }

  const nextHomeId = remainingHomeIds[0] ?? null;
  const { error: upsertError } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      current_home_id: nextHomeId,
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("[home] clear active home pointer", upsertError);
    return {
      ok: false,
      message: upsertError.message || "Could not update active property.",
    };
  }

  return { ok: true };
}

async function deleteHomeRow(
  userId: string,
  homeId: string
): Promise<DeleteHomeResult> {
  const { data, error } = await supabase
    .from("homes")
    .delete()
    .eq("id", homeId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[home] delete row", error);
    return {
      ok: false,
      message: error.message || "Could not delete property.",
    };
  }

  if (!data?.length) {
    return { ok: false, message: "Property not found or access denied." };
  }

  return { ok: true };
}

/**
 * Deletes a single property and all user-scoped data tied to that home row.
 * Ownership is enforced on the home row and on every table that stores user_id.
 */
export async function deleteHomeAndAllData(
  userId: string,
  homeId: string,
  options?: { remainingHomeIds?: string[] }
): Promise<DeleteHomeResult> {
  const normalizedUserId = userId.trim();
  const normalizedHomeId = homeId.trim();

  const owned = await assertHomeOwnedByUser(normalizedUserId, normalizedHomeId);
  if (!owned.ok) {
    return owned;
  }

  const logTables = [
    "maintenance_logs",
    "complex_issues",
    "apartment_communications",
    "notes",
  ] as const;

  for (const table of logTables) {
    const idsResult = await fetchScopedRecordIds(
      table,
      normalizedUserId,
      normalizedHomeId
    );
    if (!idsResult.ok) {
      return idsResult;
    }

    for (const recordId of idsResult.ids) {
      let deleted:
        | { ok: true }
        | { ok: false; message: string };

      if (table === "maintenance_logs") {
        deleted = await deleteMaintenanceLog(recordId, normalizedUserId);
      } else if (table === "complex_issues") {
        deleted = await deleteComplexIssue(recordId, normalizedUserId);
      } else if (table === "apartment_communications") {
        deleted = await deleteCommunication(recordId, normalizedUserId);
      } else {
        deleted = await deleteNote(recordId, normalizedUserId);
      }

      if (!deleted.ok) {
        return deleted;
      }
    }
  }

  const snapshotResult = await deleteSnapshotsForHome(
    normalizedUserId,
    normalizedHomeId
  );
  if (!snapshotResult.ok) {
    return snapshotResult;
  }

  const galleryResult = await deleteRemainingGalleryForHome(
    normalizedUserId,
    normalizedHomeId
  );
  if (!galleryResult.ok) {
    return galleryResult;
  }

  const foldersResult = await deleteFoldersForHome(
    normalizedUserId,
    normalizedHomeId
  );
  if (!foldersResult.ok) {
    return foldersResult;
  }

  const attachmentsResult = await deleteRemainingAttachmentsForHome(
    normalizedUserId,
    normalizedHomeId
  );
  if (!attachmentsResult.ok) {
    return attachmentsResult;
  }

  const documentsResult = await deleteAllDocumentsForHome(normalizedHomeId);
  if (!documentsResult.ok) {
    return documentsResult;
  }

  await removeRemainingUploadObjects(normalizedUserId, normalizedHomeId);

  let remainingHomeIds = options?.remainingHomeIds;
  if (!remainingHomeIds) {
    const { data, error } = await supabase
      .from("homes")
      .select("id")
      .eq("user_id", normalizedUserId)
      .neq("id", normalizedHomeId);

    if (error) {
      console.error("[home] fetch remaining homes", error);
      return {
        ok: false,
        message: error.message || "Could not update active property.",
      };
    }

    remainingHomeIds = (data ?? []).map((row) =>
      String((row as { id: string }).id)
    );
  }

  const pointerResult = await clearActiveHomePointerIfNeeded(
    normalizedUserId,
    normalizedHomeId,
    remainingHomeIds
  );
  if (!pointerResult.ok) {
    return pointerResult;
  }

  const homeDeleteResult = await deleteHomeRow(
    normalizedUserId,
    normalizedHomeId
  );
  if (!homeDeleteResult.ok) {
    return homeDeleteResult;
  }

  invalidateHomeCache();
  invalidateDashboardHomesCache();
  invalidateStorageCache(normalizedUserId, normalizedHomeId);
  invalidateDashboardSnapshot(normalizedUserId, normalizedHomeId);

  return { ok: true };
}
