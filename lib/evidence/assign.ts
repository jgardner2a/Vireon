import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import type { Folder } from "../galleryFoldersStore";
import type { GalleryMedia } from "../galleryStore";
import {
  evidenceLinkFromGalleryFolder,
  evidenceLinkFromGalleryMedia,
} from "./adapters";
import type { EvidenceSourceValidationContext } from "./sources";
import { validateEvidenceLink } from "./link";
import type { EvidenceLink } from "./types";

export function toEvidenceLinkForMediaAssignment(
  mediaId: number | string,
  relationship: EvidenceLink | GalleryEvidenceLink
): EvidenceLink {
  if ("sourceType" in relationship) {
    return relationship;
  }
  return evidenceLinkFromGalleryMedia(mediaId, relationship);
}

export function toEvidenceLinkForFolderAssignment(
  folderId: string,
  relationship: EvidenceLink | GalleryEvidenceLink
): EvidenceLink {
  if ("sourceType" in relationship) {
    return relationship;
  }
  return evidenceLinkFromGalleryFolder(folderId, relationship);
}

export function validationContextForMedia(
  media: GalleryMedia
): EvidenceSourceValidationContext {
  return {
    media: { id: media.id },
  };
}

export function validationContextForFolder(
  folder: Pick<Folder, "id" | "type" | "mediaIds">
): EvidenceSourceValidationContext {
  return {
    folder: {
      id: folder.id,
      type: folder.type,
      mediaIds: [...folder.mediaIds],
    },
  };
}

export function validateMediaEvidenceAssignment(
  media: GalleryMedia,
  relationship: EvidenceLink | GalleryEvidenceLink | null
): boolean {
  if (relationship === null) {
    return true;
  }

  const link = toEvidenceLinkForMediaAssignment(media.id, relationship);
  return validateEvidenceLink(link, validationContextForMedia(media)).ok;
}

export function validateFolderEvidenceAssignment(
  folder: Pick<Folder, "id" | "type" | "mediaIds">,
  relationship: EvidenceLink | GalleryEvidenceLink | null
): boolean {
  if (relationship === null) {
    return true;
  }

  const link = toEvidenceLinkForFolderAssignment(folder.id, relationship);
  return validateEvidenceLink(link, validationContextForFolder(folder)).ok;
}
