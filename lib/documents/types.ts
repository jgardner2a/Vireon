import type { DocumentType } from "@/lib/documents/documentConfig";

export type HomeDocument = {
  id: string;
  home_id: string;
  type: DocumentType;
  file_name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
};

export type UploadHomeDocumentInput = {
  homeId: string;
  type: DocumentType;
  file: File;
};
