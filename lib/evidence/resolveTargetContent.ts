import { getFolderById, listFolders, listFoldersByPropertyId } from "../galleryFoldersStore";
import type { Folder } from "../galleryFoldersStore";
import { listGalleryMedia, type GalleryMedia } from "../galleryStore";
import { listDocuments, listDocumentsByPropertyId, type Document } from "../documentsStore";
import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { evidenceLinkFromGallerySource } from "./adapters";
import {
  getEffectiveGalleryMediaEvidenceLink,
  getGalleryMediaEvidenceLink,
  isGalleryMediaEvidenceOverriddenByFolder,
} from "./gallery";
import { projectFolderEvidenceLink, projectMediaEvidenceLink } from "./project";
import { evidenceLinkMatchesTarget } from "./queries";
import type { EvidenceLink, EvidenceTargetType } from "./types";

export type ResolvedEvidenceFolder = {
  folder: Folder;
  relationship: EvidenceLink;
  media: GalleryMedia[];
};

export type ResolvedEvidenceMedia = {
  media: GalleryMedia;
  relationship: EvidenceLink;
};

export type ResolvedEvidenceDocument = {
  document: Document;
  relationship: EvidenceLink;
};

export type ResolvedTargetEvidence = {
  targetType: EvidenceTargetType;
  targetId: string;
  folders: ResolvedEvidenceFolder[];
  media: ResolvedEvidenceMedia[];
  documents: ResolvedEvidenceDocument[];
};

export type ResolveTargetEvidenceOptions = {
  propertyId?: number | string;
};

function projectDocumentEvidenceLink(document: {
  id: string;
  evidenceLink?: GalleryEvidenceLink;
}): EvidenceLink | null {
  if (!document.evidenceLink) return null;
  return evidenceLinkFromGallerySource(
    "document",
    document.id,
    document.evidenceLink
  );
}

function mediaInFolder(folder: Folder): GalleryMedia[] {
  const idSet = new Set(folder.mediaIds);
  return listGalleryMedia().filter((item) =>
    idSet.has(String(item.id))
  );
}

function resolveFoldersForTarget(
  targetType: EvidenceTargetType,
  targetId: string,
  propertyId?: number | string
): ResolvedEvidenceFolder[] {
  const folders =
    propertyId != null
      ? listFoldersByPropertyId(propertyId)
      : listFolders();

  const resolved: ResolvedEvidenceFolder[] = [];

  for (const folder of folders) {
    const relationship = projectFolderEvidenceLink(folder);
    if (!relationship) continue;
    if (!evidenceLinkMatchesTarget(relationship, targetType, targetId)) {
      continue;
    }

    resolved.push({
      folder,
      relationship,
      media: mediaInFolder(folder),
    });
  }

  return resolved.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
}

function resolveMediaForTarget(
  targetType: EvidenceTargetType,
  targetId: string,
  propertyId?: number | string
): ResolvedEvidenceMedia[] {
  const items =
    propertyId != null
      ? listGalleryMedia().filter(
          (m) => String(m.propertyId) === String(propertyId)
        )
      : listGalleryMedia();

  const resolved: ResolvedEvidenceMedia[] = [];

  for (const media of items) {
    const perMedia = projectMediaEvidenceLink(media);
    if (!perMedia) continue;
    if (!evidenceLinkMatchesTarget(perMedia, targetType, targetId)) {
      continue;
    }

    if (isGalleryMediaEvidenceOverriddenByFolder(media)) {
      const folder = getFolderById(media.folderId);
      const folderLink = folder ? projectFolderEvidenceLink(folder) : null;
      if (
        folderLink &&
        evidenceLinkMatchesTarget(folderLink, targetType, targetId)
      ) {
        continue;
      }
    }

    const effective = getEffectiveGalleryMediaEvidenceLink(media);
    if (
      !effective ||
      !evidenceLinkMatchesTarget(effective, targetType, targetId)
    ) {
      continue;
    }

    resolved.push({
      media,
      relationship: perMedia,
    });
  }

  return resolved.sort(
    (a, b) =>
      new Date(b.media.createdAt).getTime() -
      new Date(a.media.createdAt).getTime()
  );
}

function resolveDocumentsForTarget(
  targetType: EvidenceTargetType,
  targetId: string,
  propertyId?: number | string
): ResolvedEvidenceDocument[] {
  const docs =
    propertyId != null
      ? listDocumentsByPropertyId(propertyId)
      : listDocuments();

  const resolved: ResolvedEvidenceDocument[] = [];

  for (const document of docs) {
    const relationship = projectDocumentEvidenceLink(document);
    if (!relationship) continue;
    if (!evidenceLinkMatchesTarget(relationship, targetType, targetId)) {
      continue;
    }
    resolved.push({ document, relationship });
  }

  return resolved.sort(
    (a, b) =>
      new Date(b.document.createdAt).getTime() -
      new Date(a.document.createdAt).getTime()
  );
}

/**
 * Resolves all evidence sources (media, folders, documents) linked to a target
 * by scanning authoritative stores. Does not read or write issue records.
 */
export function resolveTargetEvidence(
  targetType: EvidenceTargetType,
  targetId: number | string,
  options: ResolveTargetEvidenceOptions = {}
): ResolvedTargetEvidence {
  const targetKey = String(targetId);
  const folders = resolveFoldersForTarget(
    targetType,
    targetKey,
    options.propertyId
  );
  const media = resolveMediaForTarget(
    targetType,
    targetKey,
    options.propertyId
  );
  const documents = resolveDocumentsForTarget(
    targetType,
    targetKey,
    options.propertyId
  );

  return {
    targetType,
    targetId: targetKey,
    folders,
    media,
    documents,
  };
}

export function countResolvedTargetEvidence(
  resolved: ResolvedTargetEvidence
): number {
  const folderMedia = resolved.folders.reduce(
    (n, f) => n + f.media.length,
    0
  );
  return folderMedia + resolved.media.length + resolved.documents.length;
}
