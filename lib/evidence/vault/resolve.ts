import { getFolderById } from "../../galleryFoldersStore";
import type { Folder } from "../../galleryFoldersStore";
import type { GalleryEvidenceLink } from "../../galleryEvidenceLink";
import {
  getEffectiveGalleryMediaEvidenceLink,
  getGalleryFolderEvidenceLink,
} from "../gallery";
import type { EvidenceLink } from "../types";

type GalleryMediaForResolve = {
  id: number | string;
  folderId: string;
  evidenceLink?: GalleryEvidenceLink;
};

/**
 * Resolves the effective EvidenceLink for gallery media (folder-level overrides media).
 * Read-only — does not mutate gallery or evidence stores.
 */
export function resolveVaultGalleryMediaLink(
  media: GalleryMediaForResolve
): EvidenceLink | null {
  return getEffectiveGalleryMediaEvidenceLink(media);
}

/** Resolves folder-level evidence from embedded gallery folder metadata. */
export function resolveVaultFolderLink(
  folder: Pick<Folder, "id" | "evidenceLink">
): EvidenceLink | null {
  return getGalleryFolderEvidenceLink(folder);
}

/** Folder record lookup for vault grouping (read-only). */
export function readVaultFolder(folderId: string): Folder | undefined {
  return getFolderById(folderId) ?? undefined;
}
