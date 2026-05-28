import { STORAGE_BUCKET } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

export type LogDeleteAttachmentRow = {
  id: string;
  storage_path: string;
};

async function tryRemoveStorageObject(
  storagePath: string,
  logLabel: string
): Promise<void> {
  const normalized = storagePath.trim();
  if (!normalized) {
    return;
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([normalized]);

  if (error) {
    console.error(`[${logLabel}] delete storage remove`, error);
  }
}

/**
 * Steps 3–4 after the parent log row is deleted: remove attachment rows, then
 * storage objects when no attachments reference the path.
 */
export async function cleanupAttachmentsAfterLogDelete(
  logLabel: string,
  attachments: LogDeleteAttachmentRow[]
): Promise<void> {
  for (const attachment of attachments) {
    const { error: deleteAttachmentError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachment.id);

    if (deleteAttachmentError) {
      console.error(
        `[${logLabel}] delete attachment row`,
        deleteAttachmentError
      );
    }
  }

  const uniquePaths = [
    ...new Set(
      attachments
        .map((attachment) => attachment.storage_path.trim())
        .filter((path) => path.length > 0)
    ),
  ];

  for (const path of uniquePaths) {
    const { count, error } = await supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", path);

    if (error) {
      console.error(
        `[${logLabel}] delete count attachments for storage_path`,
        error
      );
      continue;
    }

    if ((count ?? 0) === 0) {
      await tryRemoveStorageObject(path, logLabel);
    }
  }
}
