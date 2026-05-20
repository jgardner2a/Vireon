/**
 * One-time import from legacy localStorage into Supabase.
 * Runs when the authenticated profile has no properties in Supabase yet.
 */

import type { EvidenceLink } from "../evidence/types";
import {
  evidenceLinkFromGalleryFolder,
  evidenceLinkFromGalleryMedia,
} from "../evidence/adapters";
import { normalizeEvidenceLink } from "../galleryEvidenceLink";
import { normalizeIssueStatus } from "../issueStatus";
import { getAuthEmail } from "../authSession";
import { dataCache } from "./cache";
import { getGalleryStoragePath, uploadGalleryFile } from "./mediaUrl";
import { hydrateFromSupabase } from "./hydrate";
import { resolveProfileId } from "./profile";
import { supabase } from "../supabaseClient";

const LEGACY_KEYS = [
  "properties",
  "issues",
  "gallery",
  "galleryFolders",
  "leases",
  "incidents",
  "documents",
] as const;

function hasLegacyData(): boolean {
  return LEGACY_KEYS.some((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  });
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, {
    type: blob.type || "application/octet-stream",
  });
}

export async function migrateLegacyLocalStorageIfNeeded(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const email = getAuthEmail();
  if (!email) return false;

  await hydrateFromSupabase();
  if (dataCache.properties.length > 0) return false;
  if (!hasLegacyData()) return false;

  const profileId = await resolveProfileId();
  if (!profileId) return false;

  const propertyIdMap = new Map<string, string>();
  const folderIdMap = new Map<string, string>();
  const mediaIdMap = new Map<string, string>();
  const issueIdMap = new Map<string, string>();

  const legacyProperties = JSON.parse(
    localStorage.getItem("properties") ?? "[]"
  ) as Array<{ id: number | string; name: string; address: string }>;

  for (const legacy of legacyProperties) {
    const { data, error } = await supabase
      .from("properties")
      .insert({
        profile_id: profileId,
        name: legacy.name,
        address: legacy.address,
      })
      .select("id")
      .single();

    if (error || !data) continue;
    propertyIdMap.set(String(legacy.id), data.id);
  }

  const legacyFolders = JSON.parse(
    localStorage.getItem("galleryFolders") ?? "[]"
  ) as Array<{
    id: string;
    name: string;
    propertyId: string | number;
    type?: string;
    evidenceLink?: unknown;
  }>;

  for (const legacy of legacyFolders) {
    const propertyId = propertyIdMap.get(String(legacy.propertyId));
    if (!propertyId) continue;

    const { data, error } = await supabase
      .from("gallery_folders")
      .insert({
        profile_id: profileId,
        property_id: propertyId,
        name: legacy.name,
        folder_type:
          legacy.type === "system" || legacy.name === "Unsorted"
            ? "system"
            : "user",
      })
      .select("id")
      .single();

    if (error || !data) continue;
    folderIdMap.set(legacy.id, data.id);
  }

  for (const [, propertyId] of propertyIdMap) {
    const hasUnsorted = [...folderIdMap.values()].some((folderId) => {
      const legacy = legacyFolders.find((f) => folderIdMap.get(f.id) === folderId);
      return legacy?.name === "Unsorted";
    });
    if (!hasUnsorted) {
      const { data } = await supabase
        .from("gallery_folders")
        .insert({
          profile_id: profileId,
          property_id: propertyId,
          name: "Unsorted",
          folder_type: "system",
        })
        .select("id")
        .single();
      if (data) {
        folderIdMap.set(`folder-unsorted-${propertyId}`, data.id);
      }
    }
  }

  const legacyIssues = JSON.parse(localStorage.getItem("issues") ?? "[]") as Array<{
    id: number | string;
    propertyId: number | string;
    title: string;
    description: string;
    status?: string;
    createdAt: string;
  }>;

  for (const legacy of legacyIssues) {
    const propertyId = propertyIdMap.get(String(legacy.propertyId));
    if (!propertyId) continue;

    const { data, error } = await supabase
      .from("issues")
      .insert({
        profile_id: profileId,
        property_id: propertyId,
        title: legacy.title,
        description: legacy.description,
        status: normalizeIssueStatus(legacy.status),
        created_at: legacy.createdAt,
      })
      .select("id")
      .single();

    if (error || !data) continue;
    issueIdMap.set(String(legacy.id), data.id);
  }

  for (const legacy of legacyFolders) {
    const newFolderId = folderIdMap.get(legacy.id);
    if (!newFolderId) continue;
    const embedded = normalizeEvidenceLink(legacy.evidenceLink);
    if (!embedded) continue;
    const mappedTargetId = issueIdMap.get(String(embedded.id)) ?? String(embedded.id);
    const link = evidenceLinkFromGalleryFolder(newFolderId, {
      ...embedded,
      id: mappedTargetId,
    });
    if (!link) continue;
    await supabase.from("evidence_links").upsert({
      profile_id: profileId,
      source_type: link.sourceType,
      source_id: link.sourceId,
      target_type: link.targetType,
      target_id: link.targetId,
    });
  }

  const legacyGallery = JSON.parse(localStorage.getItem("gallery") ?? "[]") as Array<{
    id: number | string;
    propertyId: number | string;
    folderId?: string;
    dataUrl?: string;
    name?: string;
    mimeType?: string;
    type?: string;
    createdAt?: string;
    evidenceLink?: unknown;
  }>;

  for (const legacy of legacyGallery) {
    const propertyId = propertyIdMap.get(String(legacy.propertyId));
    if (!propertyId || !legacy.dataUrl?.startsWith("data:")) continue;

    const folderId =
      (legacy.folderId && folderIdMap.get(legacy.folderId)) ||
      [...folderIdMap.values()][0];
    if (!folderId) continue;

    const mediaId = crypto.randomUUID();
    const fileName =
      typeof legacy.name === "string" && legacy.name.trim()
        ? legacy.name
        : `upload-${mediaId}.bin`;

    try {
      const file = await dataUrlToFile(legacy.dataUrl, fileName);
      const storagePath = getGalleryStoragePath(
        profileId,
        propertyId,
        mediaId,
        fileName
      );
      const upload = await uploadGalleryFile(storagePath, file);
      if (!upload.ok) continue;

      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { data, error } = await supabase
        .from("gallery_media")
        .insert({
          id: mediaId,
          profile_id: profileId,
          property_id: propertyId,
          folder_id: folderId,
          name: fileName,
          mime_type: file.type || legacy.mimeType || "image/png",
          media_type: mediaType,
          storage_path: storagePath,
          created_at: legacy.createdAt,
        })
        .select("id")
        .single();

      if (error || !data) continue;
      mediaIdMap.set(String(legacy.id), data.id);

      const embedded = normalizeEvidenceLink(legacy.evidenceLink);
      if (embedded) {
        const link = evidenceLinkFromGalleryMedia(data.id, {
          ...embedded,
          id: issueIdMap.get(String(embedded.id)) ?? String(embedded.id),
        });
        if (link) {
          await supabase.from("evidence_links").upsert({
            profile_id: profileId,
            source_type: link.sourceType,
            source_id: link.sourceId,
            target_type: link.targetType,
            target_id: issueIdMap.get(link.targetId) ?? link.targetId,
          });
        }
      }
    } catch {
      // skip unreadable legacy blobs
    }
  }

  const legacyLeases = JSON.parse(localStorage.getItem("leases") ?? "[]") as Array<{
    propertyId: number | string;
    title: string;
    startDate: string;
    endDate?: string | null;
    createdAt?: string;
  }>;

  for (const legacy of legacyLeases) {
    const propertyId = propertyIdMap.get(String(legacy.propertyId));
    if (!propertyId) continue;
    await supabase.from("leases").upsert({
      profile_id: profileId,
      property_id: propertyId,
      title: legacy.title,
      start_date: legacy.startDate,
      end_date: legacy.endDate ?? null,
    });
  }

  for (const [, propertyId] of propertyIdMap) {
    const hasLease = legacyLeases.some(
      (l) => propertyIdMap.get(String(l.propertyId)) === propertyId
    );
    if (!hasLease) {
      const property = legacyProperties.find(
        (p) => propertyIdMap.get(String(p.id)) === propertyId
      );
      await supabase.from("leases").insert({
        profile_id: profileId,
        property_id: propertyId,
        title: `Lease · ${property?.name ?? "Property"}`,
        start_date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  await supabase
    .from("profiles")
    .update({ properties_count: propertyIdMap.size })
    .eq("id", profileId);

  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem("vireonUsers");

  await hydrateFromSupabase();
  return true;
}
