/**
 * Export Engine — read-only compiler (no tier logic here).
 * Export profile is assigned exclusively by app/api/export/route.ts.
 */

import {
  assertBasicExport,
  buildBasicExportFiles,
} from "./formatBasic";
import { buildFullExportFiles } from "./formatFull";
import { filterEvidenceLinksInScope } from "./resolve";
import {
  fetchExportSourceData,
  resolveProfileIdByEmail,
} from "./supabaseRead";
import type {
  ExportProfile,
  ExportRequest,
  ExportResult,
  ExportScope,
  ExportSourceData,
} from "./types";
import { packageExportZip } from "./zip";

function validateScope(
  profile: ExportProfile,
  scope: ExportScope
): ExportResult | null {
  if (profile === "BASIC_SNAPSHOT" && scope.kind === "all_properties") {
    return {
      ok: false,
      code: "SCOPE_NOT_ALLOWED",
      message:
        "Free exports are limited to a single property. Select one property or upgrade to Pro.",
    };
  }
  return null;
}

async function prepareSourceData(
  request: ExportRequest
): Promise<ExportSourceData> {
  const raw = await fetchExportSourceData(request.profileId, request.scope);
  return {
    ...raw,
    evidenceLinks: filterEvidenceLinksInScope(raw.evidenceLinks, raw),
  };
}

/**
 * Runs the export pipeline for a server-assigned profile.
 * @param request.profile — set only by the export API route (never trust client).
 */
export async function runExport(request: ExportRequest): Promise<ExportResult> {
  const scopeError = validateScope(request.profile, request.scope);
  if (scopeError) return scopeError;

  const verifiedId = await resolveProfileIdByEmail(request.email);
  if (!verifiedId || verifiedId !== request.profileId) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Could not verify export access for this account.",
    };
  }

  try {
    const data = await prepareSourceData(request);
    const generatedAt = new Date().toISOString();

    if (data.properties.length === 0 && data.issues.length === 0) {
      return {
        ok: false,
        code: "EMPTY",
        message: "No exportable data found for this scope.",
      };
    }

    const files =
      request.profile === "FULL_PACKAGE"
        ? await buildFullExportFiles(data)
        : buildBasicExportFiles(data);

    if (request.profile === "BASIC_SNAPSHOT") {
      assertBasicExport(files);
    }

    const { blob, filename } = await packageExportZip(
      request.profile,
      request.scope,
      generatedAt,
      files
    );

    const buffer = await blob.arrayBuffer();

    return {
      ok: true,
      package: {
        profile: request.profile,
        scope: request.scope,
        generatedAt,
        filename,
        files: [
          {
            path: filename,
            content: new Uint8Array(buffer),
          },
        ],
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export failed unexpectedly.";
    return { ok: false, code: "EXPORT_FAILED", message };
  }
}
