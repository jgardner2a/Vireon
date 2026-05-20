import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { isAllowedEvidenceSourceType } from "./sources";
import type { EvidenceLink, EvidenceSourceType } from "./types";

/**
 * Legacy gallery metadata stores only the target (issue | incident | maintenance | lease).
 * These helpers project that shape into the centralized relationship model.
 */

export function evidenceLinkFromGallerySource(
  sourceType: EvidenceSourceType,
  sourceId: string | number,
  target: GalleryEvidenceLink
): EvidenceLink {
  return {
    sourceType,
    sourceId: String(sourceId),
    targetType: target.type,
    targetId: target.id,
  };
}

export function evidenceLinkFromGalleryMedia(
  mediaId: string | number,
  target: GalleryEvidenceLink
): EvidenceLink {
  return evidenceLinkFromGallerySource("media", mediaId, target);
}

export function evidenceLinkFromGalleryFolder(
  folderId: string,
  target: GalleryEvidenceLink
): EvidenceLink {
  return evidenceLinkFromGallerySource("folder", folderId, target);
}

export function evidenceLinkFromDocument(
  documentId: string,
  target: GalleryEvidenceLink
): EvidenceLink {
  return evidenceLinkFromGallerySource("document", documentId, target);
}

/**
 * Extracts the legacy target payload stored on gallery media/folder records.
 * Use only while metadata remains embedded on those entities.
 */
export function evidenceLinkToGalleryTarget(
  link: EvidenceLink
): GalleryEvidenceLink | undefined {
  if (!isAllowedEvidenceSourceType(link.sourceType)) {
    return undefined;
  }

  if (link.sourceType === "document") {
    return {
      type: link.targetType,
      id: link.targetId,
    };
  }

  if (link.sourceType !== "media" && link.sourceType !== "folder") {
    return undefined;
  }

  return {
    type: link.targetType,
    id: link.targetId,
  };
}

/** @deprecated Use isMediaEvidenceSource */
export function isGalleryMediaEvidenceLink(link: EvidenceLink): boolean {
  return link.sourceType === "media";
}

/** @deprecated Use isFolderEvidenceSource */
export function isGalleryFolderEvidenceLink(link: EvidenceLink): boolean {
  return link.sourceType === "folder";
}
