import type { EvidenceLink } from "../evidence/types";
import type { GalleryMedia } from "../galleryStore";
import type { Folder } from "../galleryFoldersStore";
import { UNSORTED_FOLDER_NAME } from "../galleryFoldersStore";
import type { IncidentLog } from "../incidentsStore";
import type { Issue } from "../issuesStore";
import type { Lease } from "../leasesStore";
import type { Property } from "../propertiesStore";
import type { Document } from "../documentsStore";
import { normalizeIssueStatus } from "../issueStatus";
import {
  assertResidenceStatus,
  PROPERTY_RESIDENCE_CURRENT,
  type PropertyResidenceStatus,
} from "../property/residenceStatus";
import { dataCache, resetDataCache } from "./cache";
import { getGalleryPublicUrl } from "./mediaUrl";
import { getThumbnailPublicUrl } from "./thumbnailStorage";
import { resolveProfileId } from "./profile";
import { supabase } from "../supabaseClient";

function mapProperty(row: {
  id: string;
  name: string;
  address: string;
  residence_status: string;
}): Property {
  assertResidenceStatus(row.residence_status);
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    residenceStatus: row.residence_status,
  };
}

function mapIssue(row: {
  id: string;
  property_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}): Issue {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: normalizeIssueStatus(row.status),
    createdAt: row.created_at,
    propertyId: row.property_id,
  };
}

function mapLease(row: {
  id: string;
  property_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}): Lease {
  return {
    id: row.id,
    propertyId: row.property_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

function mapIncident(row: {
  id: string;
  property_id: string;
  title: string;
  notes: string;
  created_at: string;
}): IncidentLog {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    createdAt: row.created_at,
    propertyId: row.property_id,
  };
}

function mapDocument(row: {
  id: string;
  property_id: string;
  name: string;
  file_name: string | null;
  mime_type: string | null;
  storage_path: string | null;
  created_at: string;
}): Document {
  const doc: Document = {
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    createdAt: row.created_at,
  };
  if (row.file_name) doc.fileName = row.file_name;
  if (row.mime_type) doc.mimeType = row.mime_type;
  if (row.storage_path) {
    doc.dataUrl = getGalleryPublicUrl(row.storage_path);
  }
  return doc;
}

function mapEvidenceLink(row: {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
}): EvidenceLink {
  return {
    sourceType: row.source_type as EvidenceLink["sourceType"],
    sourceId: row.source_id,
    targetType: row.target_type as EvidenceLink["targetType"],
    targetId: row.target_id,
  };
}

function buildFolders(
  folderRows: Array<{
    id: string;
    property_id: string;
    name: string;
    folder_type: string;
    created_at: string;
  }>,
  mediaRows: Array<{ id: string; folder_id: string }>,
  evidenceLinks: EvidenceLink[]
): Folder[] {
  const mediaByFolder = new Map<string, string[]>();
  for (const m of mediaRows) {
    const list = mediaByFolder.get(m.folder_id) ?? [];
    list.push(String(m.id));
    mediaByFolder.set(m.folder_id, list);
  }

  const evidenceByFolderId = new Map<string, EvidenceLink>();
  for (const link of evidenceLinks) {
    if (link.sourceType === "folder") {
      evidenceByFolderId.set(link.sourceId, link);
    }
  }

  return folderRows.map((row) => {
    const folder: Folder = {
      id: row.id,
      name: row.name,
      propertyId: row.property_id,
      type: row.folder_type === "system" ? "system" : "user",
      createdAt: new Date(row.created_at),
      mediaIds: mediaByFolder.get(row.id) ?? [],
    };
    const link = evidenceByFolderId.get(row.id);
    if (link) {
      folder.evidenceLink = {
        type: link.targetType,
        id: link.targetId,
      };
    }
    return folder;
  });
}

function buildGalleryMedia(
  rows: Array<{
    id: string;
    property_id: string;
    folder_id: string;
    name: string;
    mime_type: string;
    media_type: string;
    storage_path: string;
    thumbnail_path: string | null;
    created_at: string;
  }>,
  evidenceLinks: EvidenceLink[]
): GalleryMedia[] {
  const evidenceByMediaId = new Map<string, EvidenceLink>();
  for (const link of evidenceLinks) {
    if (link.sourceType === "media") {
      evidenceByMediaId.set(link.sourceId, link);
    }
  }

  return rows.map((row) => {
    const dataUrl = getGalleryPublicUrl(row.storage_path);
    const thumbnailUrl = row.thumbnail_path
      ? getThumbnailPublicUrl(row.thumbnail_path)
      : dataUrl;

    const media: GalleryMedia = {
      id: row.id,
      propertyId: row.property_id,
      folderId: row.folder_id,
      type: row.media_type === "video" ? "video" : "image",
      dataUrl,
      thumbnailUrl,
      name: row.name,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      storagePath: row.storage_path,
    };
    const link = evidenceByMediaId.get(row.id);
    if (link) {
      media.evidenceLink = { type: link.targetType, id: link.targetId };
    }
    return media;
  });
}

/**
 * Loads renter domain data into in-memory cache (not localStorage).
 * Does NOT hydrate subscription tier — callers use `getSubscriptionPlan(profileId)`.
 */
export async function hydrateFromSupabase(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  resetDataCache();

  const profileId = await resolveProfileId();
  if (!profileId) {
    dataCache.hydrated = true;
    return false;
  }

  const [
    propertiesRes,
    issuesRes,
    foldersRes,
    mediaRes,
    evidenceRes,
    leasesRes,
    incidentsRes,
    documentsRes,
  ] = await Promise.all([
    supabase.from("properties").select("*").eq("profile_id", profileId),
    supabase.from("issues").select("*").eq("profile_id", profileId),
    supabase.from("gallery_folders").select("*").eq("profile_id", profileId),
    supabase.from("gallery_media").select("*").eq("profile_id", profileId),
    supabase.from("evidence_links").select("*").eq("profile_id", profileId),
    supabase.from("leases").select("*").eq("profile_id", profileId),
    supabase.from("incidents").select("*").eq("profile_id", profileId),
    supabase.from("documents").select("*").eq("profile_id", profileId),
  ]);

  if (propertiesRes.error) {
    console.error("[hydrate] properties", propertiesRes.error);
    return false;
  }

  const evidenceLinks = (evidenceRes.data ?? []).map(mapEvidenceLink);

  const properties = (propertiesRes.data ?? []).map(mapProperty);
  properties.sort((a, b) => {
    if (a.residenceStatus === b.residenceStatus) return 0;
    return a.residenceStatus === PROPERTY_RESIDENCE_CURRENT ? -1 : 1;
  });
  dataCache.properties = properties;
  dataCache.issues = (issuesRes.data ?? []).map(mapIssue).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  dataCache.evidenceLinks = evidenceLinks;
  dataCache.galleryMedia = buildGalleryMedia(mediaRes.data ?? [], evidenceLinks);
  dataCache.folders = buildFolders(
    foldersRes.data ?? [],
    (mediaRes.data ?? []).map((m) => ({ id: m.id, folder_id: m.folder_id })),
    evidenceLinks
  );
  dataCache.leases = (leasesRes.data ?? []).map(mapLease);
  dataCache.incidents = (incidentsRes.data ?? []).map(mapIncident);
  dataCache.documents = (documentsRes.data ?? []).map(mapDocument);
  dataCache.hydrated = true;

  return true;
}

export { UNSORTED_FOLDER_NAME };
