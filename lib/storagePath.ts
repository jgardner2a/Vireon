/** Supabase Storage bucket for all home-scoped files. */
export const STORAGE_BUCKET = "uploads";

/** Bucket-relative path for .list(): {user_id}/{home_id} */
export function storagePath(userId: string, homeId: string): string;
/** Bucket-relative object path: {user_id}/{home_id}/{filename} */
export function storagePath(
  userId: string,
  homeId: string,
  fileName: string
): string;
export function storagePath(
  userId: string,
  homeId: string,
  fileName?: string
): string {
  if (fileName === undefined) {
    return `${userId}/${homeId}`;
  }
  return `${userId}/${homeId}/${fileName}`;
}

/** @deprecated Use storagePath */
export const getStoragePath = storagePath;
