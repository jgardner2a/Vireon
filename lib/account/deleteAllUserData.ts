import { DOCUMENTS_BUCKET } from "@/lib/documents/documentConfig";
import { getSupabaseAdmin } from "@/lib/supabase/adminClient";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeleteAllUserDataResult =
  | { ok: true }
  | { ok: false; message: string };

async function deleteWhereUserId(
  admin: SupabaseClient,
  table: string,
  userId: string
): Promise<DeleteAllUserDataResult> {
  const { error } = await admin.from(table).delete().eq("user_id", userId);

  if (error) {
    console.error(`[account] delete ${table}`, error);
    return {
      ok: false,
      message: error.message || `Could not delete ${table}.`,
    };
  }

  return { ok: true };
}

async function fetchHomeIds(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true; homeIds: string[] } | { ok: false; message: string }> {
  const { data, error } = await admin
    .from("homes")
    .select("id")
    .eq("user_id", userId);

  if (error) {
    console.error("[account] fetch homes", error);
    return {
      ok: false,
      message: error.message || "Could not load properties for deletion.",
    };
  }

  return {
    ok: true,
    homeIds: (data ?? []).map((row) => String((row as { id: string }).id)),
  };
}

async function deleteSnapshotsForHomes(
  admin: SupabaseClient,
  homeIds: string[]
): Promise<DeleteAllUserDataResult> {
  if (homeIds.length === 0) {
    return { ok: true };
  }

  const { data: snapshots, error: snapshotError } = await admin
    .from("snapshots")
    .select("id")
    .in("home_id", homeIds);

  if (snapshotError) {
    console.error("[account] fetch snapshots", snapshotError);
    return {
      ok: false,
      message: snapshotError.message || "Could not delete snapshots.",
    };
  }

  const snapshotIds = (snapshots ?? []).map((row) =>
    String((row as { id: string }).id)
  );

  if (snapshotIds.length === 0) {
    return { ok: true };
  }

  const { error: issuesError } = await admin
    .from("snapshot_issues")
    .delete()
    .in("snapshot_id", snapshotIds);

  if (issuesError) {
    console.error("[account] delete snapshot_issues", issuesError);
    return {
      ok: false,
      message: issuesError.message || "Could not delete snapshot issues.",
    };
  }

  const { error: imagesError } = await admin
    .from("snapshot_images")
    .delete()
    .in("snapshot_id", snapshotIds);

  if (imagesError) {
    console.error("[account] delete snapshot_images", imagesError);
    return {
      ok: false,
      message: imagesError.message || "Could not delete snapshot images.",
    };
  }

  const { error: snapshotsDeleteError } = await admin
    .from("snapshots")
    .delete()
    .in("id", snapshotIds);

  if (snapshotsDeleteError) {
    console.error("[account] delete snapshots", snapshotsDeleteError);
    return {
      ok: false,
      message: snapshotsDeleteError.message || "Could not delete snapshots.",
    };
  }

  return { ok: true };
}

async function deleteDocumentsForHomes(
  admin: SupabaseClient,
  homeIds: string[]
): Promise<DeleteAllUserDataResult> {
  if (homeIds.length === 0) {
    return { ok: true };
  }

  const { data: documents, error: fetchError } = await admin
    .from("documents")
    .select("storage_path")
    .in("home_id", homeIds);

  if (fetchError) {
    console.error("[account] fetch documents", fetchError);
    return {
      ok: false,
      message: fetchError.message || "Could not delete documents.",
    };
  }

  const storagePaths = (documents ?? [])
    .map((row) => String((row as { storage_path: string }).storage_path ?? ""))
    .filter((path) => path.length > 0);

  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error("[account] delete document storage", storageError);
      return {
        ok: false,
        message: storageError.message || "Could not delete document files.",
      };
    }
  }

  const { error: deleteError } = await admin
    .from("documents")
    .delete()
    .in("home_id", homeIds);

  if (deleteError) {
    console.error("[account] delete documents", deleteError);
    return {
      ok: false,
      message: deleteError.message || "Could not delete documents.",
    };
  }

  return { ok: true };
}

async function removeUploadObjectsForHome(
  admin: SupabaseClient,
  userId: string,
  homeId: string
): Promise<void> {
  const prefix = storagePath(userId, homeId);
  const { data, error } = await admin.storage
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

  const { error: removeError } = await admin.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    console.error("[account] delete upload storage", removeError);
  }
}

async function removeDocumentBucketPrefixes(
  admin: SupabaseClient,
  homeIds: string[]
): Promise<void> {
  for (const homeId of homeIds) {
    const { data, error } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .list(homeId, { limit: 1000 });

    if (error || !data?.length) {
      continue;
    }

    for (const entry of data) {
      if (!entry.name) {
        continue;
      }

      const typePrefix = `${homeId}/${entry.name}`;
      const { data: files, error: listError } = await admin.storage
        .from(DOCUMENTS_BUCKET)
        .list(typePrefix, { limit: 1000 });

      if (listError || !files?.length) {
        continue;
      }

      const paths = files
        .map((file) => file.name)
        .filter(Boolean)
        .map((fileName) => `${typePrefix}/${fileName}`);

      if (paths.length > 0) {
        await admin.storage.from(DOCUMENTS_BUCKET).remove(paths);
      }
    }
  }
}

const USER_SCOPED_TABLES = [
  "attachments",
  "gallery",
  "maintenance_logs",
  "complex_issues",
  "apartment_communications",
  "notes",
  "folders",
  "evidence",
  "uploads",
] as const;

/** Removes all app data for a user. Caller must delete the auth user separately. */
export async function deleteAllUserData(
  userId: string,
  admin: SupabaseClient = getSupabaseAdmin()
): Promise<DeleteAllUserDataResult> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { ok: false, message: "Invalid user." };
  }

  const homesResult = await fetchHomeIds(admin, normalizedUserId);
  if (!homesResult.ok) {
    return homesResult;
  }

  const { homeIds } = homesResult;

  const snapshotsResult = await deleteSnapshotsForHomes(admin, homeIds);
  if (!snapshotsResult.ok) {
    return snapshotsResult;
  }

  for (const table of USER_SCOPED_TABLES) {
    const result = await deleteWhereUserId(admin, table, normalizedUserId);
    if (!result.ok) {
      return result;
    }
  }

  const documentsResult = await deleteDocumentsForHomes(admin, homeIds);
  if (!documentsResult.ok) {
    return documentsResult;
  }

  for (const homeId of homeIds) {
    await removeUploadObjectsForHome(admin, normalizedUserId, homeId);
  }

  await removeDocumentBucketPrefixes(admin, homeIds);

  const { error: userStateError } = await admin
    .from("user_state")
    .delete()
    .eq("user_id", normalizedUserId);

  if (userStateError) {
    console.error("[account] delete user_state", userStateError);
    return {
      ok: false,
      message: userStateError.message || "Could not delete account state.",
    };
  }

  const { error: homesError } = await admin
    .from("homes")
    .delete()
    .eq("user_id", normalizedUserId);

  if (homesError) {
    console.error("[account] delete homes", homesError);
    return {
      ok: false,
      message: homesError.message || "Could not delete properties.",
    };
  }

  const { error: profilesError } = await admin
    .from("profiles")
    .delete()
    .eq("id", normalizedUserId);

  if (profilesError) {
    console.error("[account] delete profiles", profilesError);
    return {
      ok: false,
      message: profilesError.message || "Could not delete profile.",
    };
  }

  return { ok: true };
}
