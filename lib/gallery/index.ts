/**
 * Gallery — My Home media input layer.
 *
 * Responsibilities:
 * - Uploads (images/videos scoped to properties)
 * - Folder organization (including system Unsorted folder)
 * - Media management (move, delete, list)
 *
 * Gallery MAY create EvidenceLinks only via `./evidence` → `evidence/persistLinks`
 * (Supabase `evidence_links`). Embedded fields on media/folders are hydration mirrors.
 *
 * Gallery MUST NOT:
 * - Act as the Evidence Vault (no timeline/relationship-map projections here)
 * - Duplicate evidence in a separate store (no vault-localStorage keys)
 *
 * Read-only evidence visualization lives in `lib/evidence/vault/`.
 * Cross-entity “linked media” queries live in `lib/evidence/linkedGallery.ts`.
 */

export type {
  AddGalleryMediaInput,
  AddGalleryMediaResult,
  GalleryMedia,
  GalleryMediaType,
} from "../galleryStore";

export {
  addGalleryMedia,
  assignMediaToFolder,
  canCurrentUserUploadGallery,
  deleteFolder,
  galleryMediaIdString,
  getGalleryUploadLimitLabel,
  getPropertyForMedia,
  GALLERY_LIMIT_MESSAGE,
  GALLERY_LIMIT_REACHED_CODE,
  listGalleryMedia,
  listGalleryMediaByFolderId,
  listGalleryMediaByPropertyId,
  resetGalleryToEmptyState,
} from "../galleryStore";

export type { Folder, FolderType, FolderLike } from "../galleryFoldersStore";

export {
  createFolder,
  deleteFolderRecord,
  ensurePropertyHasDefaultFolder,
  getDefaultFolderIdForProperty,
  getFolderById,
  getUnsortedFolderIdForProperty,
  listFoldersByPropertyId,
  syncFolderRecordsForProperty,
  UNSORTED_FOLDER_NAME,
  updateFolderName,
} from "../galleryFoldersStore";

export {
  canAssignFolderEvidence,
  canDeleteFolder,
  canRenameFolder,
  filterFoldersForEvidenceAssignment,
  isSystemFolder,
  isUserFolder,
} from "../galleryFolderRules";

export {
  assignGalleryFolderEvidence,
  assignGalleryFolderEvidenceRelationship,
  assignGalleryMediaEvidence,
  assignGalleryMediaEvidenceRelationship,
  clearGalleryFolderEvidence,
  clearGalleryMediaEvidence,
  isGalleryMediaEvidenceOverridden,
  readGalleryFolderEvidenceLink,
  readGalleryMediaEffectiveEvidenceLink,
  readGalleryMediaEvidenceLink,
} from "./evidence";

export type { GalleryEvidenceTargetOption } from "./evidenceTargets";
export {
  buildGalleryEvidenceTargets,
  galleryEvidenceTargetKey,
} from "./evidenceTargets";
