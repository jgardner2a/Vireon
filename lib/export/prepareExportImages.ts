import { supabase } from "@/lib/supabaseClient";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import type { PreparedExportImage } from "@/lib/export/types";

const EXPORT_SIGN_EXPIRES_SECONDS = 60 * 60;

function sanitizeZipFileName(name: string): string {
  const trimmed = name.trim() || "image";
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

async function blobToJpegDataUrl(blob: Blob): Promise<string | null> {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

async function fetchSignedUrls(
  paths: string[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (paths.length === 0) {
    return resolved;
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, EXPORT_SIGN_EXPIRES_SECONDS);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (row.error || !row.signedUrl || !row.path) {
      continue;
    }
    resolved.set(row.path, row.signedUrl);
  }

  return resolved;
}

async function prepareSingleImage(
  storagePath: string,
  fileName: string,
  signedUrl: string
): Promise<PreparedExportImage | null> {
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const buffer = new Uint8Array(await blob.arrayBuffer());
    const pdfDataUrl = await blobToJpegDataUrl(blob);

    return {
      storagePath,
      fileName: sanitizeZipFileName(fileName),
      zipBytes: buffer,
      pdfDataUrl,
    };
  } catch {
    return null;
  }
}

export async function prepareExportImages(
  items: Array<{ storagePath: string; fileName: string }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, PreparedExportImage>> {
  const uniquePaths = [...new Set(items.map((item) => item.storagePath))];
  const fileNameByPath = new Map(
    items.map((item) => [item.storagePath, item.fileName])
  );

  const signedUrls = await fetchSignedUrls(uniquePaths);
  const prepared = new Map<string, PreparedExportImage>();
  const total = uniquePaths.length;
  let completed = 0;

  const batchSize = 4;
  for (let index = 0; index < uniquePaths.length; index += batchSize) {
    const batch = uniquePaths.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (storagePath) => {
        const signedUrl = signedUrls.get(storagePath);
        if (!signedUrl) {
          completed += 1;
          onProgress?.(completed, total);
          return null;
        }

        const result = await prepareSingleImage(
          storagePath,
          fileNameByPath.get(storagePath) ?? storagePath.split("/").pop() ?? "image",
          signedUrl
        );
        completed += 1;
        onProgress?.(completed, total);
        return result;
      })
    );

    for (const result of results) {
      if (result) {
        prepared.set(result.storagePath, result);
      }
    }
  }

  return prepared;
}

export function sanitizeExportArchiveName(value: string): string {
  const trimmed = value.trim() || "Property";
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
}
