/**
 * Resolves relationships and timelines from export source data (read-only).
 */

import type {
  ExportEvidenceGraph,
  ExportEvidenceLinkRow,
  ExportInsightsSnapshot,
  ExportSourceData,
  ExportTimelineEvent,
} from "./types";
import { assertExportUsesOriginalStoragePath } from "./storageGuards";
import { getStoragePublicUrl } from "./supabaseRead";

export function computeExportInsights(data: ExportSourceData): ExportInsightsSnapshot {
  const issueIdsWithEvidence = new Set<string>();
  for (const link of data.evidenceLinks) {
    if (link.target_type === "issue") {
      issueIdsWithEvidence.add(link.target_id);
    }
  }

  return {
    totalIssues: data.issues.length,
    openIssues: data.issues.filter((i) => i.status === "Open").length,
    totalMedia: data.media.length,
    totalEvidenceLinks: data.evidenceLinks.length,
    issuesWithEvidence: issueIdsWithEvidence.size,
  };
}

export function buildEvidenceGraph(data: ExportSourceData): ExportEvidenceGraph {
  const mediaById = new Map(data.media.map((m) => [m.id, m]));
  const folderById = new Map(data.folders.map((f) => [f.id, f]));
  const issueById = new Map(data.issues.map((i) => [i.id, i]));
  const docById = new Map(data.documents.map((d) => [d.id, d]));

  const nodeIds = new Set<string>();
  const nodes: ExportEvidenceGraph["nodes"] = [];

  function addNode(id: string, kind: "source" | "target", entityType: string, label: string) {
    const key = `${kind}:${entityType}:${id}`;
    if (nodeIds.has(key)) return;
    nodeIds.add(key);
    nodes.push({ id: key, kind, entityType, label });
  }

  for (const link of data.evidenceLinks) {
    const sourceLabel = labelForSource(link, mediaById, folderById, docById);
    const targetLabel = labelForTarget(link, issueById);
    addNode(link.source_id, "source", link.source_type, sourceLabel);
    addNode(link.target_id, "target", link.target_type, targetLabel);
  }

  return {
    version: 1,
    nodes,
    edges: data.evidenceLinks.map((link) => ({
      id: link.id,
      sourceType: link.source_type,
      sourceId: link.source_id,
      targetType: link.target_type,
      targetId: link.target_id,
      createdAt: link.created_at,
    })),
  };
}

function labelForSource(
  link: ExportEvidenceLinkRow,
  mediaById: Map<string, { name: string }>,
  folderById: Map<string, { name: string }>,
  docById: Map<string, { name: string }>
): string {
  if (link.source_type === "media") {
    return mediaById.get(link.source_id)?.name ?? link.source_id;
  }
  if (link.source_type === "folder") {
    return folderById.get(link.source_id)?.name ?? link.source_id;
  }
  if (link.source_type === "document") {
    return docById.get(link.source_id)?.name ?? link.source_id;
  }
  return link.source_id;
}

function labelForTarget(
  link: ExportEvidenceLinkRow,
  issueById: Map<string, { title: string }>
): string {
  if (link.target_type === "issue") {
    return issueById.get(link.target_id)?.title ?? link.target_id;
  }
  return link.target_id;
}

export function buildTimeline(data: ExportSourceData): ExportTimelineEvent[] {
  const events: ExportTimelineEvent[] = [];

  for (const issue of data.issues) {
    events.push({
      id: `issue:${issue.id}`,
      occurredAt: issue.created_at,
      type: "issue",
      label: issue.title,
      propertyId: issue.property_id,
      refId: issue.id,
    });
  }

  for (const item of data.media) {
    events.push({
      id: `media:${item.id}`,
      occurredAt: item.created_at,
      type: "media",
      label: item.name,
      propertyId: item.property_id,
      refId: item.id,
    });
  }

  for (const doc of data.documents) {
    events.push({
      id: `document:${doc.id}`,
      occurredAt: doc.created_at,
      type: "document",
      label: doc.name,
      propertyId: doc.property_id,
      refId: doc.id,
    });
  }

  for (const link of data.evidenceLinks) {
    events.push({
      id: `link:${link.id}`,
      occurredAt: link.created_at,
      type: "evidence_link",
      label: `${link.source_type} → ${link.target_type}`,
      propertyId: null,
      refId: link.id,
    });
  }

  return events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

/** Public URLs for originals in bucket `gallery` only (never gallery-thumbnails). */
export function mediaPublicUrls(data: ExportSourceData): Map<string, string> {
  const urls = new Map<string, string>();
  for (const item of data.media) {
    assertExportUsesOriginalStoragePath(item.storage_path);
    urls.set(item.id, getStoragePublicUrl(item.storage_path));
  }
  for (const doc of data.documents) {
    if (doc.storage_path) {
      assertExportUsesOriginalStoragePath(doc.storage_path);
      urls.set(doc.id, getStoragePublicUrl(doc.storage_path));
    }
  }
  return urls;
}

export function filterEvidenceLinksInScope(
  links: ExportEvidenceLinkRow[],
  data: ExportSourceData
): ExportEvidenceLinkRow[] {
  const mediaIds = new Set(data.media.map((m) => m.id));
  const folderIds = new Set(data.folders.map((f) => f.id));
  const docIds = new Set(data.documents.map((d) => d.id));
  const issueIds = new Set(data.issues.map((i) => i.id));

  return links.filter((link) => {
    const sourceInScope =
      (link.source_type === "media" && mediaIds.has(link.source_id)) ||
      (link.source_type === "folder" && folderIds.has(link.source_id)) ||
      (link.source_type === "document" && docIds.has(link.source_id));
    if (!sourceInScope) return false;
    if (link.target_type === "issue") {
      return issueIds.has(link.target_id);
    }
    return true;
  });
}
