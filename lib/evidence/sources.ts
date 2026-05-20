import type { FolderType } from "../galleryFolderRules";
import { isSystemFolder, isUserFolder } from "../galleryFolderRules";
import { isTransientEvidenceEntityId } from "./entityIds";
import type { EvidenceSourceType } from "./types";

/** Canonical evidence source kinds (persisted entities only). */
export const ALLOWED_EVIDENCE_SOURCE_TYPES = [
  "media",
  "folder",
  "document",
] as const satisfies readonly EvidenceSourceType[];

export type EvidenceSourceValidationCode =
  | "INVALID_SOURCE_TYPE"
  | "MISSING_SOURCE_ID"
  | "TRANSIENT_SOURCE"
  | "SYSTEM_FOLDER"
  | "EMPTY_FOLDER"
  | "UNKNOWN_MEDIA"
  | "UNKNOWN_FOLDER"
  | "UNKNOWN_DOCUMENT"
  | "SOURCE_ENTITY_MISMATCH";

export type EvidenceSourceValidationResult =
  | { ok: true }
  | { ok: false; code: EvidenceSourceValidationCode; message: string };

export type MediaEvidenceSourceInput = {
  id: string | number;
};

export type FolderEvidenceSourceInput = {
  id: string;
  type: FolderType;
  mediaIds: string[];
};

export type DocumentEvidenceSourceInput = {
  id: string;
};

export type EvidenceSourceValidationContext = {
  media?: MediaEvidenceSourceInput | null;
  folder?: FolderEvidenceSourceInput | null;
  document?: DocumentEvidenceSourceInput | null;
};

const LEGACY_SOURCE_TYPE_ALIASES: Record<string, EvidenceSourceType> = {
  gallery_media: "media",
  gallery_folder: "folder",
};

/** Maps legacy persisted sourceType values to canonical types. */
export function normalizeEvidenceSourceType(
  raw: unknown
): EvidenceSourceType | undefined {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim();
  if ((ALLOWED_EVIDENCE_SOURCE_TYPES as readonly string[]).includes(key)) {
    return key as EvidenceSourceType;
  }
  return LEGACY_SOURCE_TYPE_ALIASES[key];
}

export function isAllowedEvidenceSourceType(
  value: unknown
): value is EvidenceSourceType {
  return normalizeEvidenceSourceType(value) != null;
}

/** @deprecated Use isTransientEvidenceEntityId */
export function isTransientEvidenceSourceId(sourceId: string): boolean {
  return isTransientEvidenceEntityId(sourceId);
}

function fail(
  code: EvidenceSourceValidationCode,
  message: string
): EvidenceSourceValidationResult {
  return { ok: false, code, message };
}

export function validateMediaEvidenceSource(
  media: MediaEvidenceSourceInput
): EvidenceSourceValidationResult {
  const id = String(media.id).trim();
  if (isTransientEvidenceSourceId(id)) {
    return fail(
      "TRANSIENT_SOURCE",
      "Media evidence sources must reference persisted gallery items."
    );
  }
  return { ok: true };
}

export function validateFolderEvidenceSource(
  folder: FolderEvidenceSourceInput
): EvidenceSourceValidationResult {
  const id = folder.id.trim();
  if (isTransientEvidenceSourceId(id)) {
    return fail(
      "TRANSIENT_SOURCE",
      "Folder evidence sources must reference persisted folders."
    );
  }

  if (isSystemFolder(folder)) {
    return fail(
      "SYSTEM_FOLDER",
      "System folders such as Unsorted cannot be used as evidence sources."
    );
  }

  if (!isUserFolder(folder)) {
    return fail("INVALID_SOURCE_TYPE", "Only user folders may be evidence sources.");
  }

  if (folder.mediaIds.length === 0) {
    return fail(
      "EMPTY_FOLDER",
      "Empty folders cannot be used as evidence sources."
    );
  }

  return { ok: true };
}

export function validateDocumentEvidenceSource(
  document: DocumentEvidenceSourceInput
): EvidenceSourceValidationResult {
  const id = document.id.trim();
  if (isTransientEvidenceSourceId(id)) {
    return fail(
      "TRANSIENT_SOURCE",
      "Document evidence sources must reference persisted documents."
    );
  }
  return { ok: true };
}

/**
 * Validates source type + id and optional resolved entity context.
 * Use before creating or persisting an EvidenceLink.
 */
export function validateEvidenceSource(
  sourceType: unknown,
  sourceId: unknown,
  context: EvidenceSourceValidationContext = {}
): EvidenceSourceValidationResult {
  const normalizedType = normalizeEvidenceSourceType(sourceType);
  if (!normalizedType) {
    return fail(
      "INVALID_SOURCE_TYPE",
      "Evidence source must be media, folder, or document."
    );
  }

  const id = String(sourceId ?? "").trim();
  if (!id) {
    return fail("MISSING_SOURCE_ID", "Evidence source id is required.");
  }

  if (isTransientEvidenceSourceId(id)) {
    return fail(
      "TRANSIENT_SOURCE",
      "Transient or UI-only references cannot be evidence sources."
    );
  }

  switch (normalizedType) {
    case "media": {
      if (!context.media) {
        return fail("UNKNOWN_MEDIA", "Gallery media source was not found.");
      }
      if (String(context.media.id).trim() !== id) {
        return fail("SOURCE_ENTITY_MISMATCH", "Media source id does not match.");
      }
      return validateMediaEvidenceSource(context.media);
    }
    case "folder": {
      if (!context.folder) {
        return fail("UNKNOWN_FOLDER", "Folder source was not found.");
      }
      if (context.folder.id.trim() !== id) {
        return fail("SOURCE_ENTITY_MISMATCH", "Folder source id does not match.");
      }
      return validateFolderEvidenceSource(context.folder);
    }
    case "document": {
      if (!context.document) {
        return fail("UNKNOWN_DOCUMENT", "Document source was not found.");
      }
      if (context.document.id.trim() !== id) {
        return fail(
          "SOURCE_ENTITY_MISMATCH",
          "Document source id does not match."
        );
      }
      return validateDocumentEvidenceSource(context.document);
    }
    default:
      return fail(
        "INVALID_SOURCE_TYPE",
        "Evidence source must be media, folder, or document."
      );
  }
}

/** Whether a user folder with content may be assigned folder-level evidence. */
export function canFolderBeEvidenceSource(
  folder: FolderEvidenceSourceInput
): boolean {
  return validateFolderEvidenceSource(folder).ok;
}

export function isMediaEvidenceSource(link: {
  sourceType: EvidenceSourceType;
}): boolean {
  return link.sourceType === "media";
}

export function isFolderEvidenceSource(link: {
  sourceType: EvidenceSourceType;
}): boolean {
  return link.sourceType === "folder";
}

export function isDocumentEvidenceSource(link: {
  sourceType: EvidenceSourceType;
}): boolean {
  return link.sourceType === "document";
}
