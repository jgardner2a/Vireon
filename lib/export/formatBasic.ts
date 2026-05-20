import { mediaPublicUrls } from "./resolve";
import type { ExportFileEntry, ExportSourceData } from "./types";

/** Free tier may only emit these paths (exact allowlist). */
export const BASIC_EXPORT_ALLOWLIST = [
  "summary.json",
  "issues.json",
  "media_thumbnails.json",
] as const;

function json(path: string, value: unknown): ExportFileEntry {
  return {
    path,
    content: JSON.stringify(value, null, 2),
  };
}

/**
 * BASIC_SNAPSHOT (Free) — minimal, non-structural export.
 * No timeline, evidence graph, folders, insights, or media binaries.
 */
export function buildBasicExportFiles(data: ExportSourceData): ExportFileEntry[] {
  const urls = mediaPublicUrls(data);

  const summary = {
    label: "Basic evidence snapshot",
    generatedAt: data.fetchedAt,
    counts: {
      properties: data.properties.length,
      issues: data.issues.length,
      media: data.media.length,
    },
  };

  const issues = data.issues.map((issue) => ({
    title: issue.title,
    status: issue.status,
    timestamp: issue.created_at,
  }));

  // URL list for free-tier snapshot — full originals via storage_path, not generated thumbnails.
  const mediaThumbnails = data.media
    .map((item) => urls.get(item.id) ?? null)
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  return [
    json("summary.json", summary),
    json("issues.json", issues),
    json("media_thumbnails.json", mediaThumbnails),
  ];
}

export function assertBasicExport(files: ExportFileEntry[]): void {
  const paths = files.map((f) => f.path);

  if (paths.length !== BASIC_EXPORT_ALLOWLIST.length) {
    throw new Error(
      `Basic export must contain exactly ${BASIC_EXPORT_ALLOWLIST.length} files.`
    );
  }

  for (const allowed of BASIC_EXPORT_ALLOWLIST) {
    if (!paths.includes(allowed)) {
      throw new Error(`Basic export missing required file: ${allowed}`);
    }
  }

  const forbiddenPatterns = [
    "timeline",
    "evidence_graph",
    "insights",
    "manifest",
    "property.json",
    "folders/",
    "issues/",
    "media/images",
    "media/videos",
    "media/documents",
  ];

  for (const path of paths) {
    if (!BASIC_EXPORT_ALLOWLIST.includes(path as (typeof BASIC_EXPORT_ALLOWLIST)[number])) {
      throw new Error(`Forbidden basic export file: ${path}`);
    }
    for (const pattern of forbiddenPatterns) {
      if (path.includes(pattern)) {
        throw new Error(`Basic export cannot include path matching: ${pattern}`);
      }
    }
  }
}
