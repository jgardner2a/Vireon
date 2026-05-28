import { DOCUMENTS_BUCKET } from "@/lib/documents/documentConfig";
import { supabase } from "@/lib/supabaseClient";

/** Short-lived URL for viewing; regenerated on each fetch (not stored in DB). */
const DOCUMENT_VIEW_URL_EXPIRES_SECONDS = 60 * 60;

export async function createDocumentViewUrl(
  storagePath: string
): Promise<string | null> {
  const path = storagePath.trim();
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, DOCUMENT_VIEW_URL_EXPIRES_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[documents] signed url", error);
    return null;
  }

  return data.signedUrl;
}
