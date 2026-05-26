import type { SupabaseErrorLike } from "@/lib/gallery/supabaseErrors";

/** Optional gallery columns; code works if these are absent in Postgres. */
export type GalleryLifecyclePatch = {
  is_deleted?: boolean;
  is_deleting?: boolean;
  storage_missing?: boolean;
  deleted_at?: string | null;
  updated_at?: string;
};

export function isMissingColumnError(error: SupabaseErrorLike | null): boolean {
  if (!error) {
    return false;
  }

  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}

export function isNotFoundStorageError(error: SupabaseErrorLike | null): boolean {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("object not found") ||
    message.includes("does not exist")
  );
}
