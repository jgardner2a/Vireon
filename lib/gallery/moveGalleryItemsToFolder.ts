import { supabase } from "@/lib/supabaseClient";

export type MoveGalleryItemsToFolderInput = {
  userId: string;
  homeId: string;
  /** Gallery row primary keys only — not storage paths. */
  galleryIds: string[];
  folderId: string | null;
};

/**
 * In-place gallery metadata update: sets folder_id on existing rows by id.
 * No storage, attachments, inserts, or owner/evidence changes.
 */
export async function moveGalleryItemsToFolder(
  input: MoveGalleryItemsToFolderInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.galleryIds.length === 0) {
    return { ok: false, message: "Select at least one image to move." };
  }

  const { error } = await supabase
    .from("gallery")
    .update({ folder_id: input.folderId })
    .in("id", input.galleryIds)
    .eq("user_id", input.userId)
    .eq("home_id", input.homeId);

  if (error) {
    console.error("[gallery] move to folder", error);
    return {
      ok: false,
      message: error.message || "Could not move images.",
    };
  }

  return { ok: true };
}
