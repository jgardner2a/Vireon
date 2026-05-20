/**
 * Export-only Supabase reads.
 * MUST NOT import stores, cache, vault, insights, or places modules.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertExportGalleryBucket,
  assertExportUsesOriginalStoragePath,
  EXPORT_ORIGINAL_GALLERY_BUCKET,
} from "./storageGuards";
import type {
  ExportDocumentRow,
  ExportEvidenceLinkRow,
  ExportFolderRow,
  ExportIssueRow,
  ExportMediaRow,
  ExportPropertyRow,
  ExportScope,
  ExportSourceData,
} from "./types";

const GALLERY_BUCKET = EXPORT_ORIGINAL_GALLERY_BUCKET;
assertExportGalleryBucket(GALLERY_BUCKET);

function createExportSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, key);
}

export async function resolveProfileIdByEmail(
  email: string
): Promise<string | null> {
  const supabase = createExportSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

function propertyIdsForScope(
  scope: ExportScope,
  properties: ExportPropertyRow[]
): Set<string> {
  if (scope.kind === "property") {
    return new Set([scope.propertyId]);
  }
  if (scope.kind === "issue") {
    return new Set([scope.propertyId]);
  }
  return new Set(properties.map((p) => p.id));
}

/** Loads all export source rows from Postgres (read-only). */
export async function fetchExportSourceData(
  profileId: string,
  scope: ExportScope
): Promise<ExportSourceData> {
  const supabase = createExportSupabase();
  const fetchedAt = new Date().toISOString();

  let propertiesQuery = supabase
    .from("properties")
    .select("id, name, address, created_at")
    .eq("profile_id", profileId);

  if (scope.kind === "property") {
    propertiesQuery = propertiesQuery.eq("id", scope.propertyId);
  } else if (scope.kind === "issue") {
    propertiesQuery = propertiesQuery.eq("id", scope.propertyId);
  }

  const { data: properties, error: propertiesError } = await propertiesQuery;
  if (propertiesError) {
    throw new Error(`Failed to load properties: ${propertiesError.message}`);
  }

  const propertyRows = (properties ?? []) as ExportPropertyRow[];
  const propertyIds = propertyIdsForScope(scope, propertyRows);

  if (propertyRows.length === 0) {
    return {
      fetchedAt,
      profileId,
      scope,
      properties: [],
      issues: [],
      folders: [],
      media: [],
      documents: [],
      evidenceLinks: [],
    };
  }

  const propertyIdList = [...propertyIds];

  let issuesQuery = supabase
    .from("issues")
    .select("id, property_id, title, description, status, created_at")
    .eq("profile_id", profileId)
    .in("property_id", propertyIdList);

  if (scope.kind === "issue") {
    issuesQuery = issuesQuery.eq("id", scope.issueId);
  }

  const [
    issuesRes,
    foldersRes,
    mediaRes,
    documentsRes,
    evidenceRes,
  ] = await Promise.all([
    issuesQuery,
    supabase
      .from("gallery_folders")
      .select("id, property_id, name, folder_type, created_at")
      .eq("profile_id", profileId)
      .in("property_id", propertyIdList),
    supabase
      .from("gallery_media")
      // Explicit columns only — never thumbnail_path / has_thumbnail.
      .select(
        "id, property_id, folder_id, name, mime_type, media_type, storage_path, created_at"
      )
      .eq("profile_id", profileId)
      .in("property_id", propertyIdList),
    supabase
      .from("documents")
      .select(
        "id, property_id, name, file_name, mime_type, storage_path, created_at"
      )
      .eq("profile_id", profileId)
      .in("property_id", propertyIdList),
    supabase.from("evidence_links").select("*").eq("profile_id", profileId),
  ]);

  if (issuesRes.error) {
    throw new Error(`Failed to load issues: ${issuesRes.error.message}`);
  }

  const issues = (issuesRes.data ?? []) as ExportIssueRow[];
  const media = (mediaRes.data ?? []) as ExportMediaRow[];
  const documents = (documentsRes.data ?? []) as ExportDocumentRow[];

  for (const item of media) {
    assertExportUsesOriginalStoragePath(item.storage_path);
  }
  for (const doc of documents) {
    if (doc.storage_path) {
      assertExportUsesOriginalStoragePath(doc.storage_path);
    }
  }

  return {
    fetchedAt,
    profileId,
    scope,
    properties: propertyRows,
    issues,
    folders: (foldersRes.data ?? []) as ExportFolderRow[],
    media,
    documents,
    evidenceLinks: (evidenceRes.data ?? []) as ExportEvidenceLinkRow[],
  };
}

export function getStoragePublicUrl(storagePath: string): string {
  assertExportUsesOriginalStoragePath(storagePath);
  const supabase = createExportSupabase();
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Read-only download from Supabase Storage. */
export async function downloadStorageObject(
  storagePath: string
): Promise<Uint8Array | null> {
  assertExportUsesOriginalStoragePath(storagePath);
  const supabase = createExportSupabase();
  const { data, error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error("[export] storage download", storagePath, error?.message);
    return null;
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}
