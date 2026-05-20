import { formatEvidenceTargetLabel } from "../labels";
import { isSystemFolder } from "../../galleryFolderRules";
import { readGalleryMediaForVault } from "./reads";
import { readVaultFolder, resolveVaultFolderLink } from "./resolve";
import type { VaultEntry, VaultFolderContainer, VaultImageEntry } from "./types";

export function isVaultGalleryImage(
  entry: VaultEntry
): entry is VaultImageEntry {
  return entry.type === "image" && entry.imageSource === "gallery";
}

export function partitionFeedEntries(entries: VaultEntry[]): {
  timeline: VaultEntry[];
  gallery: VaultImageEntry[];
} {
  const timeline: VaultEntry[] = [];
  const gallery: VaultImageEntry[] = [];

  for (const entry of entries) {
    if (isVaultGalleryImage(entry)) {
      gallery.push(entry);
    } else {
      timeline.push(entry);
    }
  }

  return { timeline, gallery };
}

function folderEvidenceLabel(folderId: string): string | null {
  const folder = readVaultFolder(folderId);
  if (!folder) return null;
  const relationship = resolveVaultFolderLink(folder);
  if (!relationship) return null;
  return formatEvidenceTargetLabel(relationship);
}

/** Groups gallery media entries under folders for relationship visualization. */
export function groupVaultGalleryByFolder(
  galleryEntries: VaultImageEntry[]
): VaultFolderContainer[] {
  if (galleryEntries.length === 0) return [];

  const mediaFolderById = new Map<string, string>();
  for (const item of readGalleryMediaForVault()) {
    mediaFolderById.set(String(item.id), item.folderId);
  }

  const byFolder = new Map<string, VaultImageEntry[]>();
  const unassigned: VaultImageEntry[] = [];

  for (const entry of galleryEntries) {
    const mediaId = entry.galleryMediaId;
    const folderId =
      mediaId != null ? mediaFolderById.get(String(mediaId)) : undefined;

    if (!folderId) {
      unassigned.push(entry);
      continue;
    }

    const list = byFolder.get(folderId) ?? [];
    list.push(entry);
    byFolder.set(folderId, list);
  }

  const containers: VaultFolderContainer[] = [];

  for (const [folderId, media] of byFolder) {
    const folder = readVaultFolder(folderId);
    containers.push({
      folderId,
      folderName: folder?.name ?? "Unknown folder",
      folderEvidenceLabel: folderEvidenceLabel(folderId),
      media: [...media].sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
    });
  }

  containers.sort((a, b) => {
    if (a.folderId === "__unassigned__") return 1;
    if (b.folderId === "__unassigned__") return -1;

    const aFolder = readVaultFolder(a.folderId);
    const bFolder = readVaultFolder(b.folderId);
    const aSystem = aFolder != null && isSystemFolder(aFolder);
    const bSystem = bFolder != null && isSystemFolder(bFolder);

    if (aSystem !== bSystem) {
      return aSystem ? 1 : -1;
    }

    return a.folderName.localeCompare(b.folderName);
  });

  if (unassigned.length > 0) {
    containers.push({
      folderId: "__unassigned__",
      folderName: "Unassigned gallery media",
      folderEvidenceLabel: null,
      media: [...unassigned].sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
    });
  }

  return containers;
}
