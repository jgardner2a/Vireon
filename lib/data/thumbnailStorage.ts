import { supabase } from "../supabaseClient";

export const GALLERY_THUMBNAILS_BUCKET = "gallery-thumbnails";

const THUMBNAIL_WEBP = "image/webp";

/** Object path: `{profileId}/{propertyId}/{mediaId}.webp` */
export function getThumbnailStoragePath(
  profileId: string,
  propertyId: string,
  mediaId: string
): string {
  return `${profileId}/${propertyId}/${mediaId}.webp`;
}

export function getThumbnailPublicUrl(thumbnailPath: string): string {
  const { data } = supabase.storage
    .from(GALLERY_THUMBNAILS_BUCKET)
    .getPublicUrl(thumbnailPath);
  return data.publicUrl;
}

export async function uploadThumbnailFile(
  thumbnailPath: string,
  file: Blob | File
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.storage
    .from(GALLERY_THUMBNAILS_BUCKET)
    .upload(thumbnailPath, file, {
      upsert: true,
      contentType: THUMBNAIL_WEBP,
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function removeThumbnailFile(
  thumbnailPath: string
): Promise<void> {
  await supabase.storage
    .from(GALLERY_THUMBNAILS_BUCKET)
    .remove([thumbnailPath]);
}
