import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { setFolderEvidenceRelationship } from "../galleryFoldersStore";
import {
  setGalleryMediaEvidenceRelationship,
  type GalleryMedia,
} from "../galleryStore";
import type { EvidenceLink } from "../evidence/types";
import {
  evidenceLinkFromGalleryFolder,
  evidenceLinkFromGalleryMedia,
} from "../evidence/adapters";
import {
  getEffectiveGalleryMediaEvidenceLink,
  getGalleryMediaEvidenceLink,
  isGalleryMediaEvidenceOverriddenByFolder,
} from "../evidence/gallery";
import { projectFolderEvidenceLink } from "../evidence/project";
import type { Folder } from "../galleryFoldersStore";

/**
 * Gallery evidence writes — persisted in Supabase `evidence_links` only.
 */

export async function assignGalleryMediaEvidence(
  mediaId: number | string,
  target: GalleryEvidenceLink
): Promise<boolean> {
  const relationship = evidenceLinkFromGalleryMedia(mediaId, target);
  if (!relationship) return false;
  return setGalleryMediaEvidenceRelationship(mediaId, relationship);
}

export async function assignGalleryFolderEvidence(
  folderId: string,
  target: GalleryEvidenceLink
): Promise<boolean> {
  const relationship = evidenceLinkFromGalleryFolder(folderId, target);
  if (!relationship) return false;
  return setFolderEvidenceRelationship(folderId, relationship);
}

export async function clearGalleryMediaEvidence(
  mediaId: number | string
): Promise<boolean> {
  return setGalleryMediaEvidenceRelationship(mediaId, null);
}

export async function clearGalleryFolderEvidence(
  folderId: string
): Promise<boolean> {
  return setFolderEvidenceRelationship(folderId, null);
}

export async function assignGalleryMediaEvidenceRelationship(
  mediaId: number | string,
  relationship: EvidenceLink | GalleryEvidenceLink
): Promise<boolean> {
  return setGalleryMediaEvidenceRelationship(mediaId, relationship);
}

export async function assignGalleryFolderEvidenceRelationship(
  folderId: string,
  relationship: EvidenceLink | GalleryEvidenceLink
): Promise<boolean> {
  return setFolderEvidenceRelationship(folderId, relationship);
}

export function readGalleryMediaEvidenceLink(
  media: Pick<GalleryMedia, "id" | "evidenceLink">
): EvidenceLink | null {
  return getGalleryMediaEvidenceLink(media);
}

export function readGalleryMediaEffectiveEvidenceLink(
  media: Pick<GalleryMedia, "id" | "folderId" | "evidenceLink">
): EvidenceLink | null {
  return getEffectiveGalleryMediaEvidenceLink(media);
}

export function readGalleryFolderEvidenceLink(
  folder: Pick<Folder, "id" | "evidenceLink">
): EvidenceLink | null {
  return projectFolderEvidenceLink(folder);
}

export function isGalleryMediaEvidenceOverridden(
  media: Pick<GalleryMedia, "id" | "folderId" | "evidenceLink">
): boolean {
  return isGalleryMediaEvidenceOverriddenByFolder(media);
}
