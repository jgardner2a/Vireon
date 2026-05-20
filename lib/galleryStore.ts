import { getCurrentVireonUser } from "./authUsers";
import { getProfileId } from "./data/profile";
import {
  canUploadGalleryMedia,
  FREE_PLAN_GALLERY_PER_PROPERTY,
  galleryMediaWithinPlanLimit,
  hasUnlimitedGalleryUploads,
  PRO_PLAN_GALLERY_PER_PROPERTY,
} from "./permissions";
import { getSubscriptionPlan, type UserPlan } from "./subscription/subscription";
import {
  clearAllFolderMediaAssignments,
  deleteFolderRecord,
  ensurePropertyHasDefaultFolder,
  getFolderById,
  getUnsortedFolderIdForProperty,
  isUnsortedFolder,
  syncFolderRecordsForProperty,
  UNSORTED_FOLDER_NAME,
  type DeleteFolderResult,
  type Folder,
} from "./galleryFoldersStore";
import {
  toEmbeddedGalleryEvidenceTarget,
  validateMediaEvidenceAssignment,
  type EvidenceLink,
} from "./evidence";
import type { GalleryEvidenceLink } from "./galleryEvidenceLink";
export type { GalleryEvidenceLink, GalleryEvidenceLinkType } from "./galleryEvidenceLink";
import {
  getCurrentProperty,
  listProperties,
  type Property,
} from "./propertiesStore";
import { dataCache } from "./data/cache";
import {
  insertGalleryMedia,
  refreshFolderMediaIds,
  updateMediaFolderInDb,
  deleteGalleryMediaInDb,
} from "./data/repos";
import { upsertEvidenceLink, clearEvidenceLink } from "./evidence/persistLinks";
import { evidenceLinkFromGalleryMedia } from "./evidence/adapters";

export type GalleryMediaType = "image" | "video";

/** Stable string id for folder mediaIds references (gallery storage still uses numeric id). */
export function galleryMediaIdString(mediaId: number | string): string {
  return String(mediaId);
}

export type GalleryMedia = {
  id: string;
  propertyId: string;
  /** Exactly one folder per item; assigned to Unsorted when missing or invalid. */
  folderId: string;
  type: GalleryMediaType;
  /** Public URL from Supabase Storage (display only). */
  dataUrl: string;
  /** Grid/list preview; thumbnail bucket when available, else same as dataUrl. */
  thumbnailUrl: string;
  name: string;
  mimeType: string;
  createdAt: string;
  storagePath?: string;
  /** Derived from evidence_links on hydrate; not a separate store. */
  evidenceLink?: GalleryEvidenceLink;
};

export const GALLERY_LIMIT_REACHED_CODE = "GALLERY_LIMIT_REACHED" as const;

export const GALLERY_LIMIT_MESSAGE = `You've reached the gallery limit for this property on your plan. Upgrade to Pro for a higher per-property cap.`;

function mediaTypeFromMime(mime: string): GalleryMediaType {
  return mime.startsWith("video/") ? "video" : "image";
}

export function listGalleryMedia(): GalleryMedia[] {
  if (typeof window === "undefined") return [];
  refreshFolderMediaIds();
  return [...dataCache.galleryMedia].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listGalleryMediaByPropertyId(
  propertyId: number | string
): GalleryMedia[] {
  const key = String(propertyId);
  return listGalleryMedia().filter((m) => String(m.propertyId) === key);
}

export function listGalleryMediaByFolderId(folderId: string): GalleryMedia[] {
  const key = folderId.trim();
  if (!key) return [];
  return listGalleryMedia().filter((m) => m.folderId === key);
}

/** Property-scoped media for a single folder (filters by propertyId and folderId). */
export function listGalleryMediaForPropertyFolder(
  propertyId: string | number,
  folderId: string
): GalleryMedia[] {
  const propertyKey = String(propertyId).trim();
  const folderKey = folderId.trim();
  if (!propertyKey || !folderKey) return [];

  return listGalleryMedia().filter(
    (m) =>
      String(m.propertyId) === propertyKey && m.folderId === folderKey
  );
}

/** @deprecated Import from `@/lib/evidence/linkedGallery` — not a Gallery responsibility. */
export {
  groupGalleryMediaForEvidenceLink,
  groupGalleryMediaForEvidenceTarget,
  listGalleryMediaForEvidenceLink,
  listGalleryMediaForEvidenceTarget,
  type GalleryEvidenceGroup,
  type GalleryEvidenceGroupSource,
} from "./evidence/linkedGallery";

/** @deprecated Import from `@/lib/gallery` or `@/lib/evidence/gallery`. */
export {
  getEffectiveGalleryMediaEvidenceLink as getEffectiveEvidenceRelationship,
  getGalleryMediaEvidenceLink as getMediaEvidenceRelationship,
  isGalleryMediaEvidenceOverriddenByFolder as isEvidenceLinkOverriddenByFolder,
} from "./evidence/gallery";

export function getPropertyForMedia(
  media: GalleryMedia
): Property | undefined {
  if (!media.propertyId) return undefined;
  return listProperties().find((p) => String(p.id) === String(media.propertyId));
}

/**
 * Wipes all persisted gallery media and clears folder media assignments.
 * Embedded evidence metadata on media/folders is cleared with those records.
 */
export async function resetGalleryToEmptyState(): Promise<void> {
  if (typeof window === "undefined") return;
  const items = [...dataCache.galleryMedia];
  for (const item of items) {
    await deleteGalleryMediaInDb(item);
  }
  clearAllFolderMediaAssignments();
}

export type AddGalleryMediaInput = {
  propertyId: string | number;
  files: File[];
};

export type AddGalleryMediaResult =
  | { ok: true; added: GalleryMedia[] }
  | {
      ok: false;
      code:
        | typeof GALLERY_LIMIT_REACHED_CODE
        | "INVALID_INPUT"
        | "PROPERTY_NOT_FOUND"
        | "NO_PROPERTIES"
        | "NOT_AUTHENTICATED"
        | "READ_FAILED";
      message: string;
    };

function assertCanUpload(
  plan: UserPlan,
  existingCount: number,
  incomingCount: number
): AddGalleryMediaResult | null {
  const totalAfter = existingCount + incomingCount;

  if (!canUploadGalleryMedia(plan, existingCount)) {
    return {
      ok: false,
      code: GALLERY_LIMIT_REACHED_CODE,
      message: GALLERY_LIMIT_MESSAGE,
    };
  }

  if (!galleryMediaWithinPlanLimit(plan, totalAfter)) {
    return {
      ok: false,
      code: GALLERY_LIMIT_REACHED_CODE,
      message: GALLERY_LIMIT_MESSAGE,
    };
  }

  return null;
}

/** Upload images/videos scoped to a property. Enforces plan limits in the store. */
export async function addGalleryMedia(
  input: AddGalleryMediaInput
): Promise<AddGalleryMediaResult> {
  const user = getCurrentVireonUser();
  const profileId = getProfileId();
  if (!user || !profileId) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "You must be signed in to upload media.",
    };
  }

  let plan: UserPlan;
  try {
    plan = await getSubscriptionPlan(profileId);
  } catch {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "Could not verify your subscription plan.",
    };
  }

  const files = input.files.filter(
    (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
  );

  if (!files.length || !String(input.propertyId).trim()) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Select a property and at least one image or video file.",
    };
  }

  const properties = listProperties();
  if (properties.length === 0) {
    return {
      ok: false,
      code: "NO_PROPERTIES",
      message: "Add a property before uploading to the gallery.",
    };
  }

  const property = properties.find(
    (p) => String(p.id) === String(input.propertyId)
  );
  if (!property) {
    return {
      ok: false,
      code: "PROPERTY_NOT_FOUND",
      message: "The selected property does not exist.",
    };
  }

  const existingForProperty = listGalleryMediaByPropertyId(property.id);
  const blocked = assertCanUpload(
    plan,
    existingForProperty.length,
    files.length
  );
  if (blocked) return blocked;

  const targetFolderId = getUnsortedFolderIdForProperty(property.id);
  const added: GalleryMedia[] = [];

  for (const file of files) {
    const item = await insertGalleryMedia(file, property.id, targetFolderId);
    if (!item) {
      return {
        ok: false,
        code: "READ_FAILED",
        message: "Could not upload one or more files. Try again.",
      };
    }
    added.push(item);
  }

  const blockedAfter = assertCanUpload(
    plan,
    0,
    existingForProperty.length + added.length
  );
  if (blockedAfter) {
    return blockedAfter;
  }

  return { ok: true, added };
}

/** Moves gallery media into a folder (one folder per item per property). */
export async function assignMediaToFolder(
  mediaId: number | string,
  folderId: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const folder = getFolderById(folderId);
  if (!folder) return false;

  const items = listGalleryMedia();
  const media = items.find((m) => String(m.id) === String(mediaId));
  if (!media) return false;

  if (String(media.propertyId) !== folder.propertyId) {
    return false;
  }

  return updateMediaFolderInDb(String(mediaId), folderId);
}

/** @deprecated Use assignMediaToFolder */
export function addMediaToFolder(
  mediaId: number | string,
  folderId: string
): Promise<boolean> {
  return assignMediaToFolder(mediaId, folderId);
}

export async function deleteFolder(folderId: string): Promise<DeleteFolderResult> {
  if (typeof window === "undefined") {
    return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  }

  if (isUnsortedFolder(folderId)) {
    return {
      ok: false,
      code: "PROTECTED",
      message: `The ${UNSORTED_FOLDER_NAME} folder cannot be deleted.`,
    };
  }

  const folder = getFolderById(folderId);
  if (!folder) {
    return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  }

  const unsortedId = await ensurePropertyHasDefaultFolder(folder.propertyId);
  const items = listGalleryMedia();
  let movedMediaCount = 0;

  for (const item of items) {
    if (item.folderId !== folderId) continue;
    movedMediaCount += 1;
    await updateMediaFolderInDb(String(item.id), unsortedId);
  }

  const removed = await deleteFolderRecord(folderId);
  if (!removed.ok) {
    return removed;
  }

  return { ok: true, movedMediaCount };
}

/**
 * Sets or clears optional evidence metadata on an existing gallery item.
 * Does not create duplicate media or move storage out of the gallery.
 */
export async function setGalleryMediaEvidenceRelationship(
  mediaId: number | string,
  relationship: EvidenceLink | GalleryEvidenceLink | null
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const items = listGalleryMedia();
  const media = items.find((m) => String(m.id) === String(mediaId));
  if (!media) return false;

  if (!validateMediaEvidenceAssignment(media, relationship)) {
    return false;
  }

  const embedded = toEmbeddedGalleryEvidenceTarget(relationship);
  if (relationship !== null && embedded === null) return false;

  if (relationship === null) {
    return clearEvidenceLink("media", String(mediaId));
  }

  const link = evidenceLinkFromGalleryMedia(String(mediaId), embedded!);
  if (!link) return false;
  return upsertEvidenceLink(link);
}

/** @deprecated Prefer setGalleryMediaEvidenceRelationship */
export function setGalleryMediaEvidenceLink(
  mediaId: number | string,
  evidenceLink: GalleryEvidenceLink | EvidenceLink | null
): Promise<boolean> {
  return setGalleryMediaEvidenceRelationship(mediaId, evidenceLink);
}

export async function canCurrentUserUploadGallery(): Promise<boolean> {
  const profileId = getProfileId();
  if (!profileId) return false;
  try {
    const plan = await getSubscriptionPlan(profileId);
    const current = getCurrentProperty();
    const scopeId = current?.id;
    const count = scopeId
      ? listGalleryMediaByPropertyId(scopeId).length
      : listGalleryMedia().length;
    return canUploadGalleryMedia(plan, count);
  } catch {
    return false;
  }
}

export function getGalleryUploadLimitLabel(plan: UserPlan | null): string {
  if (!plan) return "";
  if (hasUnlimitedGalleryUploads(plan)) {
    return `Pro: up to ${PRO_PLAN_GALLERY_PER_PROPERTY} items per property`;
  }
  return `Free: ${listGalleryMedia().length} / ${FREE_PLAN_GALLERY_PER_PROPERTY} items (per property)`;
}
