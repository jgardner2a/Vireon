import { supabase } from "@/lib/supabaseClient";

export type MarkGalleryAsEvidenceInput = {
  userId: string;
  homeId: string;
  galleryId: string;
  ownerType: string;
  ownerId: string;
};

type GalleryEvidenceRow = {
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
};

function deriveAttachmentFileType(mimeType: string): "image" | "pdf" | "other" {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  return "other";
}

function fileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] ?? storagePath;
}

/**
 * Updates gallery owner linkage, then ensures a matching attachments row exists.
 * Gallery update failure skips attachment insert; attachment failure does not rollback gallery.
 */
export async function markGalleryAsEvidence(
  input: MarkGalleryAsEvidenceInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: galleryRow, error: fetchError } = await supabase
    .from("gallery")
    .select("storage_path, file_name, mime_type, file_size")
    .eq("id", input.galleryId)
    .eq("user_id", input.userId)
    .eq("home_id", input.homeId)
    .single();

  if (fetchError || !galleryRow) {
    console.error("[gallery] fetch row for mark evidence", fetchError);
    return {
      ok: false,
      message: fetchError?.message || "Could not load gallery image.",
    };
  }

  const row = galleryRow as GalleryEvidenceRow;

  const { error: updateError } = await supabase
    .from("gallery")
    .update({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
    })
    .eq("id", input.galleryId)
    .eq("user_id", input.userId)
    .eq("home_id", input.homeId);

  if (updateError) {
    console.error("[gallery] mark evidence update", updateError);
    return {
      ok: false,
      message: updateError.message || "Could not mark image as evidence.",
    };
  }

  const { data: existingAttachment, error: existingError } = await supabase
    .from("attachments")
    .select("id")
    .eq("storage_path", row.storage_path)
    .eq("owner_type", input.ownerType)
    .eq("owner_id", input.ownerId)
    .maybeSingle();

  if (existingError) {
    console.error("[gallery] attachment duplicate check", existingError);
    return {
      ok: false,
      message:
        existingError.message || "Could not verify attachment for evidence.",
    };
  }

  if (existingAttachment) {
    return { ok: true };
  }

  const mimeType = row.mime_type || "image/jpeg";
  const fileName = row.file_name?.trim() || fileNameFromStoragePath(row.storage_path);

  const { error: insertError } = await supabase.from("attachments").insert({
    user_id: input.userId,
    home_id: input.homeId,
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    file_type: deriveAttachmentFileType(mimeType),
    file_name: fileName,
    storage_path: row.storage_path,
    mime_type: mimeType,
    file_size: row.file_size,
  });

  if (insertError) {
    console.error("[gallery] attachment insert after mark evidence", insertError);
    return {
      ok: false,
      message:
        insertError.message ||
        "Image marked as evidence, but attachment record could not be saved.",
    };
  }

  return { ok: true };
}
