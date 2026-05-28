import {
  DOCUMENTS_BUCKET,
  isDocumentType,
} from "@/lib/documents/documentConfig";
import type { DocumentType } from "@/lib/documents/documentConfig";
import type { HomeDocument, UploadHomeDocumentInput } from "@/lib/documents/types";
import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import { getCachedUserId } from "@/lib/sessionCache";
import { supabase } from "@/lib/supabaseClient";

type DocumentRow = {
  id: string;
  home_id: string;
  type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;
/** Unused at runtime; satisfies NOT NULL `file_url` when the column still exists. */
const DOCUMENT_FILE_URL_PLACEHOLDER = "";

async function signedUrlForStoragePath(
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[documents] createSignedUrl", error);
    return null;
  }

  return data.signedUrl;
}

async function mapRow(row: DocumentRow): Promise<HomeDocument | null> {
  if (!isDocumentType(row.type)) {
    return null;
  }

  const file_url = await signedUrlForStoragePath(row.storage_path);
  if (!file_url) {
    return null;
  }

  return {
    id: row.id,
    home_id: row.home_id,
    type: row.type,
    file_name: row.file_name,
    file_url,
    storage_path: row.storage_path,
    created_at: row.created_at,
  };
}

function safeDocumentFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "document";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
}

function documentStoragePath(homeId: string, type: DocumentType, fileName: string): string {
  return `${homeId}/${type}/${fileName}`;
}

async function deleteDocumentsByHomeAndType(
  homeId: string,
  type: DocumentType
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error: fetchError } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("home_id", homeId)
    .eq("type", type);

  if (fetchError) {
    console.error("[documents] fetch by home and type", fetchError);
    return {
      ok: false,
      message: fetchError.message || "Could not load existing documents.",
    };
  }

  const rows = (data ?? []) as Pick<DocumentRow, "id" | "storage_path">[];
  for (const row of rows) {
    const removed = await deleteDocumentRecordAndStorage({
      id: row.id,
      storage_path: row.storage_path,
    });
    if (!removed.ok) {
      return removed;
    }
  }

  return { ok: true };
}

async function deleteDocumentRecordAndStorage(
  document: Pick<HomeDocument, "id" | "storage_path">
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id);

  if (deleteError) {
    console.error("[documents] delete row", deleteError);
    return {
      ok: false,
      message: deleteError.message || "Could not remove previous document record.",
    };
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    console.error("[documents] delete storage", storageError);
    return {
      ok: false,
      message: storageError.message || "Could not remove previous document file.",
    };
  }

  return { ok: true };
}

export async function fetchDocumentsForHome(
  homeId: string
): Promise<{ ok: true; documents: HomeDocument[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, home_id, type, file_name, storage_path, created_at")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[documents] fetch", error);
    return {
      ok: false,
      message: error.message || "Could not load documents.",
    };
  }

  const mapped = await Promise.all(
    (data ?? []).map((row) => mapRow(row))
  );
  const documents = mapped.filter((row): row is HomeDocument => row !== null);

  return { ok: true, documents };
}

export async function uploadHomeDocument(
  input: UploadHomeDocumentInput
): Promise<{ ok: true; document: HomeDocument } | { ok: false; message: string }> {
  const fileName = safeDocumentFileName(input.file.name);
  const storagePath = documentStoragePath(input.homeId, input.type, fileName);

  const removed = await deleteDocumentsByHomeAndType(input.homeId, input.type);
  if (!removed.ok) {
    return removed;
  }

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      upsert: true,
      contentType: input.file.type || undefined,
    });

  if (uploadError) {
    console.error("[documents] upload storage", uploadError);
    return {
      ok: false,
      message: uploadError.message || "Could not upload document.",
    };
  }

  const recheck = await deleteDocumentsByHomeAndType(input.homeId, input.type);
  if (!recheck.ok) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return recheck;
  }

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      home_id: input.homeId,
      type: input.type,
      file_name: input.file.name,
      storage_path: storagePath,
      file_url: DOCUMENT_FILE_URL_PLACEHOLDER,
    })
    .select("id, home_id, type, file_name, storage_path, created_at")
    .single();

  if (insertError || !data) {
    console.error("[documents] insert", insertError);
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return {
      ok: false,
      message: insertError?.message || "Could not save document record.",
    };
  }

  const document = await mapRow(data);
  if (!document) {
    await supabase.from("documents").delete().eq("id", data.id);
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, message: "Could not save document record." };
  }

  const userId = await getCachedUserId();
  if (userId) {
    invalidateDashboardSnapshot(userId, input.homeId);
  }

  return { ok: true, document };
}
