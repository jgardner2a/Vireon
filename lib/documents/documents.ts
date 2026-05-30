import {
  DOCUMENTS_BUCKET,
  isDocumentType,
} from "@/lib/documents/documentConfig";
import type { DocumentType } from "@/lib/documents/documentConfig";
import { createDocumentViewUrl } from "@/lib/documents/documentSignedUrl";
import { prepareImageForUpload } from "@/lib/media/prepareImageForUpload";
import type { HomeDocument, UploadHomeDocumentInput } from "@/lib/documents/types";
import { supabase } from "@/lib/supabaseClient";

type DocumentRow = {
  id: string;
  home_id: string;
  type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

function mapRow(row: DocumentRow): Omit<HomeDocument, "viewUrl"> | null {
  if (!isDocumentType(row.type)) {
    return null;
  }

  return {
    id: row.id,
    home_id: row.home_id,
    type: row.type,
    file_name: row.file_name,
    storage_path: row.storage_path,
    created_at: row.created_at,
  };
}

async function withViewUrls(
  documents: Omit<HomeDocument, "viewUrl">[]
): Promise<HomeDocument[]> {
  return Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      viewUrl: await createDocumentViewUrl(doc.storage_path),
    }))
  );
}

function safeDocumentFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "document";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
}

function documentStoragePath(homeId: string, type: DocumentType, fileName: string): string {
  return `${homeId}/${type}/${fileName}`;
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

  const rows = (data ?? [])
    .map((row) => mapRow(row as DocumentRow))
    .filter((row): row is Omit<HomeDocument, "viewUrl"> => row !== null);

  const documents = await withViewUrls(rows);

  return { ok: true, documents };
}

async function deleteDocumentRecordAndStorage(
  document: Omit<HomeDocument, "viewUrl">
): Promise<{ ok: true } | { ok: false; message: string }> {
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

  return { ok: true };
}

export async function deleteAllDocumentsForHome(
  homeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, home_id, type, file_name, storage_path, created_at")
    .eq("home_id", homeId);

  if (error) {
    console.error("[documents] fetch for delete", error);
    return {
      ok: false,
      message: error.message || "Could not load documents for deletion.",
    };
  }

  const rows = (data ?? [])
    .map((row) => mapRow(row as DocumentRow))
    .filter((row): row is Omit<HomeDocument, "viewUrl"> => row !== null);

  for (const document of rows) {
    const deleted = await deleteDocumentRecordAndStorage(document);
    if (!deleted.ok) {
      return deleted;
    }
  }

  return { ok: true };
}

export async function uploadHomeDocument(
  input: UploadHomeDocumentInput
): Promise<{ ok: true; document: HomeDocument } | { ok: false; message: string }> {
  const isImageUpload = input.file.type.startsWith("image/");
  const prepared = isImageUpload
    ? await prepareImageForUpload(input.file)
    : input.file;
  const fileName = safeDocumentFileName(prepared.name);
  const storagePath = documentStoragePath(input.homeId, input.type, fileName);

  const existingResult = await fetchDocumentsForHome(input.homeId);
  if (!existingResult.ok) {
    return existingResult;
  }

  const existing = existingResult.documents.find((doc) => doc.type === input.type);
  if (existing) {
    const removed = await deleteDocumentRecordAndStorage(existing);
    if (!removed.ok) {
      return removed;
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, prepared, {
      upsert: true,
      contentType: prepared.type || undefined,
    });

  if (uploadError) {
    console.error("[documents] upload storage", uploadError);
    return {
      ok: false,
      message: uploadError.message || "Could not upload document.",
    };
  }

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      home_id: input.homeId,
      type: input.type,
      file_name: input.file.name,
      storage_path: storagePath,
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

  const mapped = mapRow(data as DocumentRow);
  if (!mapped) {
    return { ok: false, message: "Could not save document record." };
  }

  const viewUrl = await createDocumentViewUrl(mapped.storage_path);

  return {
    ok: true,
    document: { ...mapped, viewUrl },
  };
}
