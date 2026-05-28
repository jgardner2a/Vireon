/** Evidence logs (maintenance, notes, communications) accept images only. */

export const EVIDENCE_LOG_IMAGES_ONLY_MESSAGE =
  "Evidence logs only allow image files (for example JPEG, PNG, or WebP).";

export function isEvidenceLogImageFile(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime.startsWith("image/")) {
    return true;
  }

  const name = file.name.trim().toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i.test(name);
}

export function assertEvidenceLogImageFilesOnly(
  files: File[]
): { ok: true; files: File[] } | { ok: false; message: string } {
  if (files.length === 0) {
    return { ok: true, files: [] };
  }

  const rejected = files.filter((file) => !isEvidenceLogImageFile(file));
  if (rejected.length > 0) {
    return { ok: false, message: EVIDENCE_LOG_IMAGES_ONLY_MESSAGE };
  }

  return { ok: true, files };
}
