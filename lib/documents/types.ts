import type { DocumentType } from "@/lib/documents/documentConfig";

export type HomeDocument = {
  id: string;
  home_id: string;
  type: DocumentType;
  file_name: string;
  storage_path: string;
  created_at: string;
  /** Signed URL from storage_path; not persisted. */
  viewUrl: string | null;
};

export type UploadHomeDocumentInput = {
  homeId: string;
  type: DocumentType;
  file: File;
};
