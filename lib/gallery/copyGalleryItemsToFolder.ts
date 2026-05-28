import { supabase } from "@/lib/supabaseClient";

export type CopyGalleryItemsToFolderInput = {
  userId: string;
  homeId: string;
  galleryIds: string[];
  folderId: string | null;
};

type GalleryCopySourceRow = {
  storage_path: string;
  file_name: string | null;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  owner_type: string | null;
  owner_id: string | null;
};

/**
 * Metadata-only gallery duplication: new gallery row(s), same storage_path.
 * Does not touch storage or attachments.
 */
export async function copyGalleryItemsToFolder(
  input: CopyGalleryItemsToFolderInput
): Promise<
  { ok: true; copiedCount: number } | { ok: false; message: string }
> {
  if (input.galleryIds.length === 0) {
    return { ok: true, copiedCount: 0 };
  }

  const { data, error: fetchError } = await supabase
    .from("gallery")
    .select(
      "storage_path, file_name, file_type, mime_type, file_size, owner_type, owner_id"
    )
    .in("id", input.galleryIds)
    .eq("user_id", input.userId)
    .eq("home_id", input.homeId);

  if (fetchError) {
    console.error("[gallery] fetch rows for copy", fetchError);
    return {
      ok: false,
      message: fetchError.message || "Could not load selected images.",
    };
  }

  const sources = (data ?? []) as GalleryCopySourceRow[];
  if (sources.length === 0) {
    return {
      ok: false,
      message: "Selected images are no longer available.",
    };
  }

  const timestamp = new Date().toISOString();
  const rows = sources.map((row) => ({
    user_id: input.userId,
    home_id: input.homeId,
    storage_path: row.storage_path,
    file_name: row.file_name,
    file_type: row.file_type,
    file_size: row.file_size,
    mime_type: row.mime_type,
    folder_id: input.folderId,
    owner_type: row.owner_type,
    owner_id: row.owner_id,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { error: insertError } = await supabase.from("gallery").insert(rows);

  if (insertError) {
    console.error("[gallery] copy to folder insert", insertError);
    return {
      ok: false,
      message: insertError.message || "Could not copy images to folder.",
    };
  }

  return { ok: true, copiedCount: rows.length };
}
