import imageCompression from "browser-image-compression";
import { isEvidenceLogImageFile } from "@/lib/attachments/evidenceLogImageFiles";

/** Long edge cap — typical phone photo (e.g. 3000×4000) becomes ~1536×2048. */
export const UPLOAD_IMAGE_MAX_LONG_EDGE = 2048;

/** WebP quality passed to the encoder (0–1). */
export const UPLOAD_IMAGE_QUALITY = 0.8;

/** Hard cap; library lowers quality iteratively to meet this. */
export const UPLOAD_IMAGE_MAX_SIZE_MB = 1;

/** Skip re-encoding when already small enough. */
const SKIP_BELOW_BYTES = 512 * 1024;

const OUTPUT_MIME = "image/webp";

function replaceFileExtension(name: string, extension: string): string {
  const trimmed = name.replace(/[/\\]/g, "").trim() || "image";
  const dot = trimmed.lastIndexOf(".");
  const stem = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  return `${stem}.${extension}`;
}

function shouldCompressImageFile(file: File): boolean {
  if (!isEvidenceLogImageFile(file)) {
    return false;
  }

  if (file.type === "image/gif") {
    return false;
  }

  if (file.size < SKIP_BELOW_BYTES) {
    return false;
  }

  return true;
}

/**
 * Resize + WebP encode before storage upload. Returns the original file when
 * compression is skipped or fails (upload still proceeds).
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!shouldCompressImageFile(file)) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: UPLOAD_IMAGE_MAX_LONG_EDGE,
      maxSizeMB: UPLOAD_IMAGE_MAX_SIZE_MB,
      initialQuality: UPLOAD_IMAGE_QUALITY,
      fileType: OUTPUT_MIME,
      useWebWorker: typeof Worker !== "undefined",
      preserveExif: false,
    });

    return new File([compressed], replaceFileExtension(file.name, "webp"), {
      type: OUTPUT_MIME,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[media] image compression failed, uploading original", err);
    return file;
  }
}
