import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";

export type UploadNoteAttachmentsInput = {
  userId: string;
  homeId: string;
  noteId: string;
  files: File[];
};

export async function uploadNoteAttachments(
  input: UploadNoteAttachmentsInput
): Promise<
  { ok: true; storagePaths: string[] } | { ok: false; message: string }
> {
  return uploadFilesToGallery({
    userId: input.userId,
    homeId: input.homeId,
    files: input.files,
    logContext: "notes",
    context: "note",
    ownerId: input.noteId,
  });
}
