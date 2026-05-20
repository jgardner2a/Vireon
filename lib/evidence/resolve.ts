import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { projectFolderEvidenceLink, projectMediaEvidenceLink } from "./project";
import type { EvidenceLink } from "./types";

type GalleryMediaEvidenceSource = {
  id: number | string;
  folderId: string;
  evidenceLink?: GalleryEvidenceLink;
};

type GalleryFolderEvidenceSource = {
  id: string;
  evidenceLink?: GalleryEvidenceLink;
};

/**
 * Resolves the effective evidence relationship for a gallery file.
 * Folder-level links take precedence over per-media links (matches current store rules).
 * Read-only projection — does not read or write persistence.
 */
export function resolveGalleryMediaEvidenceLink(
  media: GalleryMediaEvidenceSource,
  folder?: GalleryFolderEvidenceSource | null
): EvidenceLink | null {
  const folderRelationship = folder
    ? projectFolderEvidenceLink(folder)
    : null;
  if (folderRelationship) {
    return folderRelationship;
  }

  return projectMediaEvidenceLink(media);
}

export function isEvidenceLinkOverriddenByFolderRelationship(
  _media: GalleryMediaEvidenceSource,
  folder?: GalleryFolderEvidenceSource | null
): boolean {
  return folder != null && projectFolderEvidenceLink(folder) != null;
}
