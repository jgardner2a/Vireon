import {
  toEmbeddedGalleryEvidenceTarget,
  validateFolderEvidenceAssignment,
  type EvidenceLink,
} from "./evidence";
import {
  canDeleteFolder,
  canRenameFolder,
  isSystemFolder,
  type FolderType,
} from "./galleryFolderRules";
import {
  normalizeEvidenceLink,
  type GalleryEvidenceLink,
} from "./galleryEvidenceLink";
import { listProperties } from "./propertiesStore";
import { dataCache } from "./data/cache";
import {
  deleteFolderInDb,
  ensureUnsortedFolderInDb,
  insertUserFolder,
  refreshFolderMediaIds,
  renameFolderInDb,
} from "./data/repos";
import { clearEvidenceLink, upsertEvidenceLink } from "./evidence/persistLinks";
import { evidenceLinkFromGalleryFolder } from "./evidence/adapters";

export type { FolderLike, FolderType } from "./galleryFolderRules";
export {
  canAssignFolderEvidence,
  canDeleteFolder,
  canRenameFolder,
  filterFoldersForEvidenceAssignment,
  isSystemFolder,
  isUserFolder,
} from "./galleryFolderRules";

export const UNSORTED_FOLDER_NAME = "Unsorted";

/** Organizational grouping for gallery media; media bytes stay in gallery storage. */
export type Folder = {
  id: string;
  name: string;
  propertyId: string;
  type: FolderType;
  createdAt: Date;
  mediaIds: string[];
  /** When set, all media in this folder inherit this link (overrides per-media links). */
  evidenceLink?: GalleryEvidenceLink;
};

type StoredFolder = {
  id: string;
  name: string;
  propertyId: string;
  type: FolderType;
  createdAt: string;
  mediaIds: string[];
  evidenceLink?: GalleryEvidenceLink;
};

function resolveFolderType(name: string, rawType: unknown): FolderType {
  if (name === UNSORTED_FOLDER_NAME) {
    return "system";
  }
  if (rawType === "system" || rawType === "user") {
    return rawType;
  }
  return "user";
}

type GalleryFolderRef = {
  id: string;
  propertyId: string;
  folderId: string;
};

function toFolder(stored: StoredFolder): Folder {
  const folder: Folder = {
    id: stored.id,
    name: stored.name,
    propertyId: stored.propertyId,
    type: stored.type,
    createdAt: new Date(stored.createdAt),
    mediaIds: [...stored.mediaIds],
  };
  if (stored.evidenceLink) {
    folder.evidenceLink = stored.evidenceLink;
  }
  return folder;
}

function toStored(folder: Folder): StoredFolder {
  const stored: StoredFolder = {
    id: folder.id,
    name: folder.name,
    propertyId: folder.propertyId,
    type: folder.type,
    createdAt: folder.createdAt.toISOString(),
    mediaIds: [...folder.mediaIds],
  };
  if (folder.evidenceLink) {
    stored.evidenceLink = folder.evidenceLink;
  }
  return stored;
}

function normalizeFolder(raw: unknown): StoredFolder | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const propertyId =
    typeof record.propertyId === "string"
      ? record.propertyId.trim()
      : record.propertyId != null
        ? String(record.propertyId).trim()
        : "";
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : "";

  if (!id || !name || !propertyId || !createdAt) return null;

  const mediaIds = Array.isArray(record.mediaIds)
    ? record.mediaIds
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean)
    : [];

  const type = resolveFolderType(name, record.type);
  const stored: StoredFolder = { id, name, propertyId, type, createdAt, mediaIds };
  const evidenceLink = normalizeEvidenceLink(record.evidenceLink);
  if (evidenceLink) {
    stored.evidenceLink = evidenceLink;
  }
  return stored;
}

function storedFolderNeedsTypeMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const type = (raw as Record<string, unknown>).type;
  return type !== "system" && type !== "user";
}

function readFolders(): StoredFolder[] {
  if (typeof window === "undefined") return [];
  refreshFolderMediaIds();
  return dataCache.folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    propertyId: folder.propertyId,
    type: folder.type,
    createdAt: folder.createdAt.toISOString(),
    mediaIds: [...folder.mediaIds],
    evidenceLink: folder.evidenceLink,
  }));
}

function writeFolders(_folders: StoredFolder[]): void {
  refreshFolderMediaIds();
}

function propertyExists(propertyId: string): boolean {
  return listProperties().some((p) => String(p.id) === propertyId);
}

function readGalleryFolderRefs(): GalleryFolderRef[] {
  if (typeof window === "undefined") return [];
  return dataCache.galleryMedia.map((item) => ({
    id: String(item.id),
    propertyId: String(item.propertyId),
    folderId: item.folderId,
  }));
}

function folderIdsForProperty(propertyId: string): Set<string> {
  const key = String(propertyId);
  return new Set(
    readFolders().filter((f) => f.propertyId === key).map((f) => f.id)
  );
}

function foldersWithDerivedMediaIds(stored: StoredFolder[]): StoredFolder[] {
  const refs = readGalleryFolderRefs();
  return stored.map((folder) => ({
    ...folder,
    mediaIds: refs
      .filter(
        (r) => r.folderId === folder.id && r.propertyId === folder.propertyId
      )
      .map((r) => r.id),
  }));
}

/** Canonical per-property system folder (Unsorted). */
function createSystemUnsortedStoredFolder(propertyId: string): StoredFolder {
  return {
    id: `folder-unsorted-${propertyId}-${Date.now()}`,
    name: UNSORTED_FOLDER_NAME,
    propertyId,
    type: "system",
    createdAt: new Date().toISOString(),
    mediaIds: [],
  };
}

/** Ensures stored system folder uses reserved name and type. */
function repairSystemUnsortedRecord(folder: StoredFolder): StoredFolder {
  return {
    ...folder,
    name: UNSORTED_FOLDER_NAME,
    type: "system",
  };
}

/**
 * Ensures the property has exactly one system "Unsorted" folder (type: system).
 * Creates, upgrades legacy records, or repairs name/type when needed.
 * Returns the Unsorted folder id.
 */
export async function ensureUnsortedFolderForProperty(
  propertyId: string | number
): Promise<string> {
  const key = String(propertyId).trim();
  if (!key) {
    throw new Error("propertyId is required to ensure a default folder.");
  }
  return ensureUnsortedFolderInDb(key);
}

/** Alias: every property must always have at least one folder (Unsorted). */
export async function ensurePropertyHasDefaultFolder(
  propertyId: string | number
): Promise<string> {
  return ensureUnsortedFolderForProperty(propertyId);
}

export async function ensureDefaultFoldersForAllProperties(): Promise<void> {
  if (typeof window === "undefined") return;

  for (const property of listProperties()) {
    await ensureUnsortedFolderForProperty(property.id);
  }
}

/** Resolves the fallback Unsorted folder for a property, creating it if missing. */
export function getUnsortedFolderIdForProperty(
  propertyId: string | number
): string {
  const key = String(propertyId).trim();
  const folder = dataCache.folders.find(
    (f) =>
      f.propertyId === key &&
      (isSystemFolder(f) || f.name === UNSORTED_FOLDER_NAME)
  );
  if (!folder) {
    throw new Error(
      "Default folder not loaded. Wait for bootstrapMyHomeData() to finish."
    );
  }
  return folder.id;
}

/** Keeps folder.mediaIds aligned with gallery media.folderId for one property. */
export function syncFolderRecordsForProperty(
  propertyId: string | number,
  memberships: { mediaId: string | number; folderId: string }[]
): void {
  const key = String(propertyId);
  const validFolderIds = folderIdsForProperty(key);

  const folders = readFolders();
  const next = folders.map((folder) => {
    if (folder.propertyId !== key) return folder;

    const mediaIds = memberships
      .filter(
        (m) =>
          String(m.folderId) === folder.id &&
          validFolderIds.has(folder.id)
      )
      .map((m) => String(m.mediaId));

    return { ...folder, mediaIds };
  });

  writeFolders(next);
}

export function listFolders(): Folder[] {
  return foldersWithDerivedMediaIds(readFolders())
    .map(toFolder)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listFoldersByPropertyId(propertyId: string | number): Folder[] {
  const key = String(propertyId);
  return listFolders()
    .filter((folder) => folder.propertyId === key)
    .sort((a, b) => {
      if (a.name === UNSORTED_FOLDER_NAME) return -1;
      if (b.name === UNSORTED_FOLDER_NAME) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

/** Default folder id for a property (Unsorted). */
export function getDefaultFolderIdForProperty(
  propertyId: string | number
): string {
  return getUnsortedFolderIdForProperty(propertyId);
}

export function getFolderById(folderId: string): Folder | null {
  const stored = foldersWithDerivedMediaIds(readFolders()).find(
    (f) => f.id === folderId
  );
  return stored ? toFolder(stored) : null;
}

export function isUnsortedFolder(folderId: string): boolean {
  const folder = readFolders().find((f) => f.id === folderId);
  return folder != null && isSystemFolder(folder);
}

export type CreateFolderInput = {
  name: string;
  propertyId: string | number;
};

export type CreateFolderResult =
  | { ok: true; folder: Folder }
  | {
      ok: false;
      code: "INVALID_INPUT" | "PROPERTY_NOT_FOUND" | "NO_PROPERTIES" | "DUPLICATE_NAME";
      message: string;
    };

export async function createFolder(
  input: CreateFolderInput
): Promise<CreateFolderResult> {
  const name = input.name.trim();
  const propertyId = String(input.propertyId).trim();

  if (!name || !propertyId) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Folder name and property are required.",
    };
  }

  if (name === UNSORTED_FOLDER_NAME) {
    return {
      ok: false,
      code: "DUPLICATE_NAME",
      message: `"${UNSORTED_FOLDER_NAME}" is reserved for the default folder.`,
    };
  }

  if (listProperties().length === 0) {
    return {
      ok: false,
      code: "NO_PROPERTIES",
      message: "Add a property before creating folders.",
    };
  }

  if (!propertyExists(propertyId)) {
    return {
      ok: false,
      code: "PROPERTY_NOT_FOUND",
      message: "The selected property does not exist.",
    };
  }

  await ensureUnsortedFolderForProperty(propertyId);

  const folder = await insertUserFolder(propertyId, name);
  if (!folder) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Could not create the folder. Try again.",
    };
  }

  return { ok: true, folder };
}

export type UpdateFolderNameResult =
  | { ok: true; folder: Folder }
  | { ok: false; code: "NOT_FOUND" | "INVALID_INPUT" | "PROTECTED"; message: string };

export async function updateFolderName(
  folderId: string,
  name: string
): Promise<UpdateFolderNameResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Folder name is required.",
    };
  }

  if (trimmed === UNSORTED_FOLDER_NAME) {
    return {
      ok: false,
      code: "PROTECTED",
      message: `"${UNSORTED_FOLDER_NAME}" is reserved for the default folder.`,
    };
  }

  const folders = readFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index === -1) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Folder not found.",
    };
  }

  if (!canRenameFolder(folders[index])) {
    return {
      ok: false,
      code: "PROTECTED",
      message: `The ${UNSORTED_FOLDER_NAME} folder cannot be renamed.`,
    };
  }

  const ok = await renameFolderInDb(folderId, trimmed);
  if (!ok) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Could not rename the folder.",
    };
  }

  const updated = getFolderById(folderId);
  return updated
    ? { ok: true, folder: updated }
    : { ok: false, code: "NOT_FOUND", message: "Folder not found." };
}

export type DeleteFolderResult =
  | { ok: true; movedMediaCount: number }
  | { ok: false; code: "NOT_FOUND" | "PROTECTED"; message: string };

/**
 * Deletes a folder and moves its media references to Unsorted (gallery folderId
 * must be updated separately via galleryStore.reassignMediaToUnsortedFolder).
 */
export async function deleteFolderRecord(
  folderId: string
): Promise<DeleteFolderResult> {
  const folders = readFolders();
  const target = folders.find((f) => f.id === folderId);

  if (!target) {
    return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  }

  if (!canDeleteFolder(target)) {
    return {
      ok: false,
      code: "PROTECTED",
      message: `The ${UNSORTED_FOLDER_NAME} folder cannot be deleted.`,
    };
  }

  const derived = foldersWithDerivedMediaIds(folders);
  const folder = derived.find((f) => f.id === folderId);
  const movedMediaCount = folder?.mediaIds.length ?? 0;

  const ok = await deleteFolderInDb(folderId);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", message: "Folder not found." };
  }

  return { ok: true, movedMediaCount };
}

/**
 * Sets or clears folder-level evidence metadata. Media in the folder inherit this
 * link when present (overriding per-media evidenceLink).
 */
export async function setFolderEvidenceRelationship(
  folderId: string,
  relationship: EvidenceLink | GalleryEvidenceLink | null
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const existing = readFolders().find((f) => f.id === folderId);
  if (!existing) return false;

  if (!validateFolderEvidenceAssignment(existing, relationship)) {
    return false;
  }

  const embedded = toEmbeddedGalleryEvidenceTarget(relationship);
  if (relationship !== null && embedded === null) return false;

  if (relationship === null) {
    return clearEvidenceLink("folder", folderId);
  }

  const link = evidenceLinkFromGalleryFolder(folderId, embedded!);
  if (!link) return false;
  return upsertEvidenceLink(link);
}

/** @deprecated Prefer setFolderEvidenceRelationship */
export function setFolderEvidenceLink(
  folderId: string,
  evidenceLink: GalleryEvidenceLink | EvidenceLink | null
): Promise<boolean> {
  return setFolderEvidenceRelationship(folderId, evidenceLink);
}

/** Clears mediaIds on every folder (folders and evidence metadata remain). */
export function clearAllFolderMediaAssignments(): void {
  if (typeof window === "undefined") return;

  const folders = readFolders();
  writeFolders(folders.map((folder) => ({ ...folder, mediaIds: [] })));
}
