import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";

export type UploadMaintenanceAttachmentsInput = {
  userId: string;
  homeId: string;
  maintenanceLogId: string;
  files: File[];
};

export async function uploadMaintenanceAttachments(
  input: UploadMaintenanceAttachmentsInput
): Promise<
  { ok: true; storagePaths: string[] } | { ok: false; message: string }
> {
  return uploadFilesToGallery({
    userId: input.userId,
    homeId: input.homeId,
    files: input.files,
    logContext: "maintenance",
    context: "maintenance",
    ownerId: input.maintenanceLogId,
  });
}
