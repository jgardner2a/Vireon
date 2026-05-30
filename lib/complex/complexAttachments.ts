import { assertEvidenceLogImageFilesOnly } from "@/lib/attachments/evidenceLogImageFiles";
import { assertCanAttachLogImages } from "@/lib/billing/planEnforcement";
import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";
import { supabase } from "@/lib/supabaseClient";

export type UploadComplexAttachmentsInput = {
  userId: string;
  homeId: string;
  complexIssueId: string;
  files: File[];
};

export type ComplexAttachment = {
  id: string;
  storage_path: string;
  file_name: string | null;
  file_type: string;
  mime_type: string | null;
};

type AttachmentRow = {
  id: string;
  storage_path: string;
  file_name: string | null;
  file_type: string;
  mime_type: string | null;
};

export async function fetchComplexAttachments(
  userId: string,
  homeId: string,
  complexIssueId: string
): Promise<
  { ok: true; items: ComplexAttachment[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, file_type, mime_type")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("owner_type", "complex")
    .eq("owner_id", complexIssueId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[complex] fetch attachments", error);
    return {
      ok: false,
      message: error.message || "Could not load attachments.",
    };
  }

  const items = (data ?? []).map((row) => {
    const r = row as AttachmentRow;
    return {
      id: r.id,
      storage_path: r.storage_path,
      file_name: r.file_name,
      file_type: r.file_type,
      mime_type: r.mime_type,
    };
  });

  return { ok: true, items };
}

export async function uploadComplexAttachments(
  input: UploadComplexAttachmentsInput
): Promise<
  { ok: true; storagePaths: string[] } | { ok: false; message: string }
> {
  const imageCheck = assertEvidenceLogImageFilesOnly(input.files);
  if (!imageCheck.ok) {
    return imageCheck;
  }

  const imageFiles = imageCheck.files;
  if (imageFiles.length === 0) {
    return { ok: true, storagePaths: [] };
  }

  const attachmentCheck = await assertCanAttachLogImages({
    userId: input.userId,
    homeId: input.homeId,
    ownerType: "complex",
    ownerId: input.complexIssueId,
    incomingCount: imageFiles.length,
  });
  if (!attachmentCheck.ok) {
    return attachmentCheck;
  }

  const galleryResult = await uploadFilesToGallery({
    userId: input.userId,
    homeId: input.homeId,
    files: imageFiles,
    logContext: "complex",
    context: "complex",
    ownerId: input.complexIssueId,
  });

  if (!galleryResult.ok) {
    return galleryResult;
  }

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const path = galleryResult.storagePaths[i];
    const mimeType = file.type || "image/jpeg";

    const { error: insertError } = await supabase.from("attachments").insert({
      user_id: input.userId,
      home_id: input.homeId,
      owner_type: "complex",
      owner_id: input.complexIssueId,
      file_type: "image",
      file_name: file.name,
      storage_path: path,
      mime_type: mimeType,
      file_size: file.size,
    });

    if (insertError) {
      console.error("[complex] attachment insert", insertError);
      return {
        ok: false,
        message: insertError.message || "Could not save attachment.",
      };
    }
  }

  return { ok: true, storagePaths: galleryResult.storagePaths };
}
