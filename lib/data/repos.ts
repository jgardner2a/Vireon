import type { EvidenceLink } from "../evidence/types";
import type { GalleryMedia } from "../galleryStore";
import type { Folder } from "../galleryFoldersStore";
import { UNSORTED_FOLDER_NAME } from "../galleryFoldersStore";
import type { Issue } from "../issuesStore";
import type { Lease } from "../leasesStore";
import {
  assertResidenceStatus,
  PROPERTY_RESIDENCE_CURRENT,
} from "../property/residenceStatus";
import type { Property } from "../propertiesStore";
import { isSystemFolder } from "../galleryFolderRules";
import { dataCache } from "./cache";
import { generateThumbnailBlob } from "../media/thumbnailGenerator";
import { uploadThumbnail } from "../media/thumbnailUpload";
import {
  getGalleryPublicUrl,
  getGalleryStoragePath,
  removeGalleryFile,
  uploadGalleryFile,
} from "./mediaUrl";
import { getProfileId } from "./profile";
import {
  getThumbnailStoragePath,
  removeThumbnailFile,
} from "./thumbnailStorage";
import { supabase } from "../supabaseClient";

function newId(): string {
  return crypto.randomUUID();
}

export async function insertProperty(
  name: string,
  address: string
): Promise<Property | null> {
  const profileId = getProfileId();
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("properties")
    .insert({
      profile_id: profileId,
      name,
      address,
      residence_status: PROPERTY_RESIDENCE_CURRENT,
    })
    .select("id, name, address, residence_status")
    .single();

  if (error || !data) {
    console.error("[repos] insertProperty", error);
    return null;
  }

  assertResidenceStatus(data.residence_status);
  const property: Property = {
    id: data.id,
    name: data.name,
    address: data.address,
    residenceStatus: data.residence_status,
  };
  dataCache.properties.push(property);
  return property;
}

/** Updates in-memory cache after a server-created property. */
export function cacheCreatedProperty(property: Property): void {
  const exists = dataCache.properties.some((p) => p.id === property.id);
  if (!exists) {
    dataCache.properties.push(property);
  }
}

export async function updateProfilePropertiesCount(count: number): Promise<void> {
  const profileId = getProfileId();
  if (!profileId) return;

  await supabase
    .from("profiles")
    .update({ properties_count: count })
    .eq("id", profileId);
}

export { countPropertiesForProfile } from "./propertyCount";

export async function insertIssue(
  issue: Omit<Issue, "id">
): Promise<Issue | null> {
  const profileId = getProfileId();
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("issues")
    .insert({
      profile_id: profileId,
      property_id: issue.propertyId,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      created_at: issue.createdAt,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] insertIssue", error);
    return null;
  }

  const row: Issue = {
    id: data.id,
    propertyId: data.property_id,
    title: data.title,
    description: data.description,
    status: issue.status,
    createdAt: data.created_at,
  };
  dataCache.issues.unshift(row);
  return row;
}

export async function updateIssueStatusRow(
  issueId: string,
  status: Issue["status"]
): Promise<Issue | null> {
  const { data, error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", issueId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] updateIssueStatus", error);
    return null;
  }

  const updated: Issue = {
    id: data.id,
    propertyId: data.property_id,
    title: data.title,
    description: data.description,
    status,
    createdAt: data.created_at,
  };

  const idx = dataCache.issues.findIndex((i) => i.id === issueId);
  if (idx !== -1) {
    dataCache.issues[idx] = updated;
  }
  return updated;
}

export async function insertLeaseForProperty(
  property: Property
): Promise<Lease | null> {
  const profileId = getProfileId();
  if (!profileId) return null;

  const now = new Date().toISOString();
  const title = `Lease · ${property.name}`;
  const startDate = now.slice(0, 10);

  const { data, error } = await supabase
    .from("leases")
    .insert({
      profile_id: profileId,
      property_id: property.id,
      title,
      start_date: startDate,
      end_date: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] insertLease", error);
    return null;
  }

  const lease: Lease = {
    id: data.id,
    propertyId: data.property_id,
    title: data.title,
    startDate: data.start_date,
    endDate: data.end_date,
    createdAt: data.created_at,
  };
  dataCache.leases.push(lease);
  return lease;
}

export async function ensureUnsortedFolderInDb(
  propertyId: string
): Promise<string> {
  const key = String(propertyId).trim();
  const existing = dataCache.folders.find(
    (f) => f.propertyId === key && isSystemFolder(f)
  );
  if (existing) return existing.id;

  const legacy = dataCache.folders.find(
    (f) => f.propertyId === key && f.name === UNSORTED_FOLDER_NAME
  );
  if (legacy) return legacy.id;

  const profileId = getProfileId();
  if (!profileId) {
    throw new Error("Profile required to create Unsorted folder.");
  }

  const folderId = newId();
  const { data, error } = await supabase
    .from("gallery_folders")
    .insert({
      id: folderId,
      profile_id: profileId,
      property_id: key,
      name: UNSORTED_FOLDER_NAME,
      folder_type: "system",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] ensureUnsortedFolder", error);
    throw new Error("Could not create Unsorted folder.");
  }

  const folder: Folder = {
    id: data.id,
    name: data.name,
    propertyId: data.property_id,
    type: "system",
    createdAt: new Date(data.created_at),
    mediaIds: [],
  };
  dataCache.folders.push(folder);
  return folder.id;
}

export async function insertUserFolder(
  propertyId: string,
  name: string
): Promise<Folder | null> {
  const profileId = getProfileId();
  if (!profileId) return null;

  const folderId = newId();
  const { data, error } = await supabase
    .from("gallery_folders")
    .insert({
      id: folderId,
      profile_id: profileId,
      property_id: propertyId,
      name,
      folder_type: "user",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] insertUserFolder", error);
    return null;
  }

  const folder: Folder = {
    id: data.id,
    name: data.name,
    propertyId: data.property_id,
    type: "user",
    createdAt: new Date(data.created_at),
    mediaIds: [],
  };
  dataCache.folders.push(folder);
  return folder;
}

export async function renameFolderInDb(
  folderId: string,
  name: string
): Promise<boolean> {
  const { error } = await supabase
    .from("gallery_folders")
    .update({ name })
    .eq("id", folderId);

  if (error) {
    console.error("[repos] renameFolder", error);
    return false;
  }

  const idx = dataCache.folders.findIndex((f) => f.id === folderId);
  if (idx !== -1) {
    dataCache.folders[idx] = { ...dataCache.folders[idx], name };
  }
  return true;
}

export async function deleteFolderInDb(folderId: string): Promise<boolean> {
  const { error } = await supabase
    .from("gallery_folders")
    .delete()
    .eq("id", folderId);

  if (error) {
    console.error("[repos] deleteFolder", error);
    return false;
  }

  dataCache.folders = dataCache.folders.filter((f) => f.id !== folderId);
  return true;
}

export async function updateMediaFolderInDb(
  mediaId: string,
  folderId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("gallery_media")
    .update({ folder_id: folderId })
    .eq("id", mediaId);

  if (error) {
    console.error("[repos] updateMediaFolder", error);
    return false;
  }

  const idx = dataCache.galleryMedia.findIndex((m) => m.id === mediaId);
  if (idx !== -1) {
    dataCache.galleryMedia[idx] = {
      ...dataCache.galleryMedia[idx],
      folderId,
    };
  }
  refreshFolderMediaIds();
  return true;
}

export function refreshFolderMediaIds(): void {
  const byFolder = new Map<string, string[]>();
  for (const media of dataCache.galleryMedia) {
    const list = byFolder.get(media.folderId) ?? [];
    list.push(String(media.id));
    byFolder.set(media.folderId, list);
  }

  dataCache.folders = dataCache.folders.map((folder) => ({
    ...folder,
    mediaIds: byFolder.get(folder.id) ?? [],
  }));
}

/** Best-effort thumbnail; never affects the primary upload result. */
function scheduleGalleryMediaThumbnail(
  file: File,
  profileId: string,
  propertyId: string,
  mediaId: string
): void {
  if (!file.type.startsWith("image/")) return;

  void (async () => {
    try {
      const blob = await generateThumbnailBlob(file);
      const thumbnailPath = getThumbnailStoragePath(
        profileId,
        propertyId,
        mediaId
      );
      const upload = await uploadThumbnail(blob, thumbnailPath);
      if (!upload.ok) {
        console.error("[repos] uploadThumbnail", upload.message);
        return;
      }

      const { error } = await supabase
        .from("gallery_media")
        .update({
          thumbnail_path: thumbnailPath,
          has_thumbnail: true,
        })
        .eq("id", mediaId);

      if (error) {
        console.error("[repos] gallery_media thumbnail update", error);
        await removeThumbnailFile(thumbnailPath);
      }
    } catch (err) {
      console.error("[repos] scheduleGalleryMediaThumbnail", err);
    }
  })();
}

export async function insertGalleryMedia(
  file: File,
  propertyId: string,
  folderId: string
): Promise<GalleryMedia | null> {
  const profileId = getProfileId();
  if (!profileId) return null;

  const mediaId = newId();
  const storagePath = getGalleryStoragePath(
    profileId,
    propertyId,
    mediaId,
    file.name
  );

  const upload = await uploadGalleryFile(storagePath, file);
  if (!upload.ok) {
    console.error("[repos] uploadGalleryFile", upload.message);
    return null;
  }

  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const { data, error } = await supabase
    .from("gallery_media")
    .insert({
      id: mediaId,
      profile_id: profileId,
      property_id: propertyId,
      folder_id: folderId,
      name: file.name,
      mime_type: file.type,
      media_type: mediaType,
      storage_path: storagePath,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[repos] insertGalleryMedia", error);
    await removeGalleryFile(storagePath);
    return null;
  }

  const dataUrl = getGalleryPublicUrl(data.storage_path);
  const media: GalleryMedia = {
    id: data.id,
    propertyId: data.property_id,
    folderId: data.folder_id,
    type: mediaType,
    dataUrl,
    thumbnailUrl: dataUrl,
    name: data.name,
    mimeType: data.mime_type,
    createdAt: data.created_at,
    storagePath: data.storage_path,
  };

  dataCache.galleryMedia.unshift(media);
  refreshFolderMediaIds();
  scheduleGalleryMediaThumbnail(file, profileId, propertyId, media.id);
  return media;
}

export async function deleteGalleryMediaInDb(
  media: GalleryMedia
): Promise<boolean> {
  const { error } = await supabase
    .from("gallery_media")
    .delete()
    .eq("id", media.id);

  if (error) {
    console.error("[repos] deleteGalleryMedia", error);
    return false;
  }

  if (media.storagePath) {
    await removeGalleryFile(media.storagePath);
  }

  dataCache.galleryMedia = dataCache.galleryMedia.filter((m) => m.id !== media.id);
  await clearEvidenceLinkForSource("media", media.id);
  refreshFolderMediaIds();
  return true;
}

async function clearEvidenceLinkForSource(
  sourceType: EvidenceLink["sourceType"],
  sourceId: string
): Promise<void> {
  const profileId = getProfileId();
  if (!profileId) return;

  await supabase
    .from("evidence_links")
    .delete()
    .eq("profile_id", profileId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  dataCache.evidenceLinks = dataCache.evidenceLinks.filter(
    (row) => !(row.sourceType === sourceType && row.sourceId === sourceId)
  );
}
