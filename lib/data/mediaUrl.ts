import { supabase } from "../supabaseClient";

const GALLERY_BUCKET = "gallery";

export function getGalleryStoragePath(
  profileId: string,
  propertyId: string,
  mediaId: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${profileId}/${propertyId}/${mediaId}/${safeName}`;
}

export function getGalleryPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadGalleryFile(
  storagePath: string,
  file: File
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function removeGalleryFile(
  storagePath: string
): Promise<void> {
  await supabase.storage.from(GALLERY_BUCKET).remove([storagePath]);
}
