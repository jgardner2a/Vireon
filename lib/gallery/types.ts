export const GALLERY_OWNER_TYPE_MAINTENANCE = "maintenance" as const;
export const GALLERY_OWNER_TYPE_NOTE = "note" as const;
export const GALLERY_OWNER_TYPE_COMMUNICATION = "communication" as const;
export const GALLERY_OWNER_TYPE_COMPLEX = "complex" as const;

export type GalleryOwnerType =
  | typeof GALLERY_OWNER_TYPE_MAINTENANCE
  | typeof GALLERY_OWNER_TYPE_NOTE
  | typeof GALLERY_OWNER_TYPE_COMMUNICATION
  | typeof GALLERY_OWNER_TYPE_COMPLEX;

export type GalleryItem = {
  id: string;
  user_id: string;
  home_id: string;
  storage_path: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  mime_type: string | null;
  folder_id: string | null;
  owner_type: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  /** Optional lifecycle columns (ignored when absent in DB). */
  is_deleting?: boolean;
  storage_missing?: boolean;
  deleted_at?: string | null;
};
