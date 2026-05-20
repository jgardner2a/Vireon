import type { GalleryMedia } from "../galleryStore";
import type { Document } from "../documentsStore";
import {
  countResolvedTargetEvidence,
  resolveTargetEvidence,
  type ResolveTargetEvidenceOptions,
  type ResolvedTargetEvidence,
} from "./resolveTargetContent";
import type { EvidenceTargetType } from "./types";

export const ISSUE_CARD_PREVIEW_THUMB_LIMIT = 3;

export type EvidenceAttachmentCounts = {
  imageCount: number;
  videoCount: number;
  documentCount: number;
  totalAttachments: number;
};

export type IssueEvidencePreview = {
  resolved: ResolvedTargetEvidence;
  /** Unique gallery media linked via folders or per-file assignments. */
  thumbnailMedia: GalleryMedia[];
  /** First N items for compact card strip. */
  previewThumbnails: GalleryMedia[];
  overflowCount: number;
  linkedDocuments: Document[];
  counts: EvidenceAttachmentCounts;
  hasEvidence: boolean;
};

function dedupeGalleryMedia(items: GalleryMedia[]): GalleryMedia[] {
  const byId = new Map<string, GalleryMedia>();
  for (const item of items) {
    byId.set(String(item.id), item);
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function collectLinkedGalleryMedia(
  resolved: ResolvedTargetEvidence
): GalleryMedia[] {
  const items: GalleryMedia[] = [];
  for (const folder of resolved.folders) {
    items.push(...folder.media);
  }
  for (const entry of resolved.media) {
    items.push(entry.media);
  }
  return dedupeGalleryMedia(items);
}

export function summarizeEvidenceAttachments(
  resolved: ResolvedTargetEvidence
): EvidenceAttachmentCounts {
  const media = collectLinkedGalleryMedia(resolved);
  let imageCount = 0;
  let videoCount = 0;

  for (const item of media) {
    if (item.type === "video") {
      videoCount += 1;
    } else {
      imageCount += 1;
    }
  }

  const documentCount = resolved.documents.length;
  const totalAttachments = media.length + documentCount;

  return {
    imageCount,
    videoCount,
    documentCount,
    totalAttachments,
  };
}

/** Human-readable attachment summary for issue cards. */
export function formatEvidenceAttachmentLabel(
  counts: EvidenceAttachmentCounts
): string | null {
  if (counts.totalAttachments === 0) {
    return null;
  }

  const parts: string[] = [];

  if (counts.imageCount > 0) {
    parts.push(
      `${counts.imageCount} photo${counts.imageCount === 1 ? "" : "s"}`
    );
  }
  if (counts.videoCount > 0) {
    parts.push(
      `${counts.videoCount} video${counts.videoCount === 1 ? "" : "s"}`
    );
  }
  if (counts.documentCount > 0) {
    parts.push(
      `${counts.documentCount} document${counts.documentCount === 1 ? "" : "s"}`
    );
  }

  if (parts.length === 0) {
    return `${counts.totalAttachments} attachment${counts.totalAttachments === 1 ? "" : "s"}`;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} · ${parts[1]}`;
  }

  return `${parts[0]} · ${parts[1]} · ${parts[2]}`;
}

/**
 * Visual resolution layer for issue evidence — reads relationships only,
 * never duplicates media onto issue records.
 */
export function buildTargetEvidencePreview(
  targetType: EvidenceTargetType,
  targetId: number | string,
  options: ResolveTargetEvidenceOptions = {}
): IssueEvidencePreview {
  const resolved = resolveTargetEvidence(targetType, targetId, options);
  const thumbnailMedia = collectLinkedGalleryMedia(resolved);
  const previewThumbnails = thumbnailMedia.slice(
    0,
    ISSUE_CARD_PREVIEW_THUMB_LIMIT
  );
  const overflowCount = Math.max(
    0,
    thumbnailMedia.length - previewThumbnails.length
  );
  const counts = summarizeEvidenceAttachments(resolved);
  const hasEvidence = countResolvedTargetEvidence(resolved) > 0;

  return {
    resolved,
    thumbnailMedia,
    previewThumbnails,
    overflowCount,
    linkedDocuments: resolved.documents.map((entry) => entry.document),
    counts,
    hasEvidence,
  };
}

/** Resolves evidence previews for an issue target. */
export function buildIssueEvidencePreview(
  issueId: number | string,
  options: ResolveTargetEvidenceOptions = {}
): IssueEvidencePreview {
  return buildTargetEvidencePreview("issue", issueId, options);
}
