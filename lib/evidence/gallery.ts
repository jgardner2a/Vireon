import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { getFolderById } from "../galleryFoldersStore";
import type { Folder } from "../galleryFoldersStore";
import { projectFolderEvidenceLink, projectMediaEvidenceLink } from "./project";
import {
  isEvidenceLinkOverriddenByFolderRelationship,
  resolveGalleryMediaEvidenceLink,
} from "./resolve";
import type { EvidenceLink, EvidenceTargetType } from "./types";
import { evidenceLinkMatchesTarget } from "./queries";

export function getGalleryFolderEvidenceLink(
  folder: Pick<Folder, "id" | "evidenceLink">
): EvidenceLink | null {
  return projectFolderEvidenceLink(folder);
}

type GalleryMediaEvidenceSource = {
  id: number | string;
  folderId: string;
  evidenceLink?: GalleryEvidenceLink;
};

export function getGalleryMediaEvidenceLink(
  media: Pick<GalleryMediaEvidenceSource, "id" | "evidenceLink">
): EvidenceLink | null {
  return projectMediaEvidenceLink(media);
}

export function getEffectiveGalleryMediaEvidenceLink(
  media: GalleryMediaEvidenceSource
): EvidenceLink | null {
  const folder = getFolderById(media.folderId);
  return resolveGalleryMediaEvidenceLink(media, folder);
}

export function isGalleryMediaEvidenceOverriddenByFolder(
  media: GalleryMediaEvidenceSource
): boolean {
  const folder = getFolderById(media.folderId);
  return isEvidenceLinkOverriddenByFolderRelationship(media, folder);
}

export function galleryMediaMatchesEvidenceTarget(
  media: GalleryMediaEvidenceSource,
  targetType: EvidenceTargetType,
  targetId: string | number
): boolean {
  const link = getEffectiveGalleryMediaEvidenceLink(media);
  if (!link) return false;
  return evidenceLinkMatchesTarget(link, targetType, targetId);
}

/** @deprecated Use getEffectiveGalleryMediaEvidenceLink — legacy target-only shape. */
export function getEffectiveEvidenceTarget(
  media: GalleryMediaEvidenceSource
): GalleryEvidenceLink | undefined {
  const link = getEffectiveGalleryMediaEvidenceLink(media);
  if (!link) return undefined;
  return { type: link.targetType, id: link.targetId };
}
