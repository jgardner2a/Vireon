import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";

export type UploadCommunicationAttachmentsInput = {
  userId: string;
  homeId: string;
  communicationId: string;
  files: File[];
};

export async function uploadCommunicationAttachments(
  input: UploadCommunicationAttachmentsInput
): Promise<
  { ok: true; storagePaths: string[] } | { ok: false; message: string }
> {
  return uploadFilesToGallery({
    userId: input.userId,
    homeId: input.homeId,
    files: input.files,
    logContext: "communications",
    context: "communication",
    ownerId: input.communicationId,
  });
}
