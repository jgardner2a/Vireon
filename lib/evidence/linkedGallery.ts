import { getFolderById } from "../galleryFoldersStore";
import type { Folder } from "../galleryFoldersStore";
import { listGalleryMedia, type GalleryMedia } from "../galleryStore";
import type { GalleryEvidenceLinkType } from "../galleryEvidenceLink";
import { getEffectiveGalleryMediaEvidenceLink } from "./gallery";
import { projectFolderEvidenceLink } from "./project";
import { evidenceLinkMatchesTarget } from "./queries";
import type { EvidenceTargetType } from "./types";

/**
 * Read-only queries: gallery media linked to an evidence target.
 * Used by issue/detail views and the Vault — not for Gallery management UI.
 */

export function listGalleryMediaForEvidenceTarget(
  targetType: EvidenceTargetType,
  targetId: number | string
): GalleryMedia[] {
  return listGalleryMedia().filter((item) => {
    const link = getEffectiveGalleryMediaEvidenceLink(item);
    if (!link) return false;
    return evidenceLinkMatchesTarget(link, targetType, targetId);
  });
}

/** @deprecated Use listGalleryMediaForEvidenceTarget */
export function listGalleryMediaForEvidenceLink(
  type: GalleryEvidenceLinkType,
  recordId: number | string
): GalleryMedia[] {
  return listGalleryMediaForEvidenceTarget(type, recordId);
}

export type LinkedGalleryGroupSource = "folder" | "media";

export type LinkedGalleryMediaGroup = {
  id: string;
  title: string;
  source: LinkedGalleryGroupSource;
  items: GalleryMedia[];
};

/** Groups media linked to a target by folder vs per-file assignment (read-only). */
export function groupGalleryMediaForEvidenceTarget(
  targetType: EvidenceTargetType,
  targetId: number | string
): LinkedGalleryMediaGroup[] {
  const items = listGalleryMediaForEvidenceTarget(targetType, targetId);
  const direct: GalleryMedia[] = [];
  const folderMap = new Map<string, { folder: Folder; items: GalleryMedia[] }>();

  for (const item of items) {
    const folder = getFolderById(item.folderId);
    const folderRelationship = folder
      ? projectFolderEvidenceLink(folder)
      : null;
    const viaFolder =
      folderRelationship != null &&
      evidenceLinkMatchesTarget(folderRelationship, targetType, targetId);

    if (viaFolder && folder) {
      const existing = folderMap.get(folder.id);
      if (existing) {
        existing.items.push(item);
      } else {
        folderMap.set(folder.id, { folder, items: [item] });
      }
    } else {
      direct.push(item);
    }
  }

  const groups: LinkedGalleryMediaGroup[] = [];

  for (const { folder, items: folderItems } of folderMap.values()) {
    groups.push({
      id: folder.id,
      title: folder.name,
      source: "folder",
      items: folderItems,
    });
  }

  if (direct.length > 0) {
    groups.push({
      id: "media-direct",
      title: "Individual files",
      source: "media",
      items: direct,
    });
  }

  return groups.sort((a, b) => {
    if (a.source !== b.source) {
      return a.source === "folder" ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
}

/** @deprecated Use groupGalleryMediaForEvidenceTarget */
export function groupGalleryMediaForEvidenceLink(
  type: GalleryEvidenceLinkType,
  recordId: number | string
): LinkedGalleryMediaGroup[] {
  return groupGalleryMediaForEvidenceTarget(type, recordId);
}

/** @deprecated Renamed to LinkedGalleryMediaGroup */
export type GalleryEvidenceGroup = LinkedGalleryMediaGroup;

/** @deprecated Renamed to LinkedGalleryGroupSource */
export type GalleryEvidenceGroupSource = LinkedGalleryGroupSource;
