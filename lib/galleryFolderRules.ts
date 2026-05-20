/**
 * Single source of truth for folder behavior (system vs user).
 * Store and UI should delegate rename, evidence, and display rules here.
 */

import { canFolderBeEvidenceSource } from "./evidence/sources";

export type FolderType = "system" | "user";

/** Minimal folder shape for rule checks. */
export type FolderLike = {
  type: FolderType;
  id?: string;
  mediaIds?: string[];
};

export function isSystemFolder(folder: FolderLike): boolean {
  return folder.type === "system";
}

export function isUserFolder(folder: FolderLike): boolean {
  return folder.type === "user";
}

/** Whether the folder name may be changed. */
export function canRenameFolder(folder: FolderLike): boolean {
  return isUserFolder(folder);
}

/** Whether the folder may be removed. */
export function canDeleteFolder(folder: FolderLike): boolean {
  return isUserFolder(folder);
}

/** Whether folder-level evidence metadata may be assigned. */
export function canAssignFolderEvidence(folder: FolderLike): boolean {
  if (!isUserFolder(folder)) return false;
  if (folder.id != null && folder.mediaIds != null) {
    return canFolderBeEvidenceSource({
      id: folder.id,
      type: folder.type,
      mediaIds: folder.mediaIds,
    });
  }
  return true;
}

/** Folders that may be chosen as folder-level evidence targets. */
export function filterFoldersForEvidenceAssignment<T extends FolderLike>(
  folders: T[]
): T[] {
  return folders.filter(canAssignFolderEvidence);
}
