import {
  buildEvidenceGraph,
  buildTimeline,
  computeExportInsights,
} from "./resolve";
import { assertExportUsesOriginalStoragePath } from "./storageGuards";
import { downloadStorageObject } from "./supabaseRead";
import type { ExportFileEntry, ExportSourceData } from "./types";

const INSIGHTS_DISCLAIMER =
  "Derived snapshot for export packaging only. Not authoritative and not used as system input elsewhere.";

function json(path: string, value: unknown): ExportFileEntry {
  return {
    path,
    content: JSON.stringify(value, null, 2),
  };
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** FULL_PACKAGE (Pro) — complete faithful export. */
export async function buildFullExportFiles(
  data: ExportSourceData
): Promise<ExportFileEntry[]> {
  const insights = computeExportInsights(data);
  const timeline = buildTimeline(data);
  const graph = buildEvidenceGraph(data);
  const files: ExportFileEntry[] = [];

  const propertyPayload =
    data.properties.length === 1
      ? data.properties[0]
      : { properties: data.properties };

  files.push(json("property.json", propertyPayload));

  for (const issue of data.issues) {
    files.push(json(`issues/${safeFileName(issue.id)}.json`, issue));
  }

  for (const folder of data.folders) {
    files.push(json(`folders/${safeFileName(folder.id)}.json`, folder));
  }

  files.push(json("evidence_graph.json", graph));
  files.push(json("timeline.json", timeline));
  files.push(
    json("insights.json", {
      _meta: {
        disclaimer: INSIGHTS_DISCLAIMER,
        derivedAt: data.fetchedAt,
        nonAuthoritative: true,
      },
      ...insights,
    })
  );

  for (const item of data.media) {
    assertExportUsesOriginalStoragePath(item.storage_path);
    const bytes = await downloadStorageObject(item.storage_path);
    if (!bytes) continue;
    const ext = item.media_type === "video" ? "mp4" : "bin";
    const folder = item.media_type === "video" ? "media/videos" : "media/images";
    files.push({
      path: `${folder}/${safeFileName(item.id)}-${safeFileName(item.name)}.${ext}`,
      content: bytes,
    });
  }

  for (const doc of data.documents) {
    if (!doc.storage_path) {
      files.push(json(`media/documents/${safeFileName(doc.id)}.json`, doc));
      continue;
    }
    const bytes = await downloadStorageObject(doc.storage_path);
    if (bytes) {
      files.push({
        path: `media/documents/${safeFileName(doc.id)}-${safeFileName(doc.name)}`,
        content: bytes,
      });
    } else {
      files.push(json(`media/documents/${safeFileName(doc.id)}.json`, doc));
    }
  }

  const manifest = {
    format: "vireon-export-full-v1",
    profile: "FULL_PACKAGE",
    generatedAt: data.fetchedAt,
    scope: data.scope,
    fileCount: files.length + 1,
    entries: [
      "manifest.json",
      "property.json",
      ...data.issues.map((i) => `issues/${i.id}.json`),
      ...data.folders.map((f) => `folders/${f.id}.json`),
      "evidence_graph.json",
      "timeline.json",
      "insights.json",
    ],
  };

  files.unshift(json("manifest.json", manifest));

  return files;
}
