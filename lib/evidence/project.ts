import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import {
  evidenceLinkFromGalleryFolder,
  evidenceLinkFromGalleryMedia,
} from "./adapters";
import type { EvidenceLink } from "./types";

/** Projects embedded folder metadata into a relationship (legacy storage shape). */
export function projectFolderEvidenceLink(folder: {
  id: string;
  evidenceLink?: GalleryEvidenceLink;
}): EvidenceLink | null {
  if (!folder.evidenceLink) return null;
  return evidenceLinkFromGalleryFolder(folder.id, folder.evidenceLink);
}

/** Projects embedded media metadata into a relationship (legacy storage shape). */
export function projectMediaEvidenceLink(media: {
  id: number | string;
  evidenceLink?: GalleryEvidenceLink;
}): EvidenceLink | null {
  if (!media.evidenceLink) return null;
  return evidenceLinkFromGalleryMedia(media.id, media.evidenceLink);
}
