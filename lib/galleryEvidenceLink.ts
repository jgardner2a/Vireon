/**
 * Legacy embedded target reference on gallery media/folder records.
 * New work should model relationships with `EvidenceLink` in `lib/evidence/`.
 */

import { isTransientEvidenceEntityId } from "./evidence/entityIds";
import {
  isForbiddenEvidenceTargetType,
  normalizeEvidenceTargetType,
} from "./evidence/targets";
import type { EvidenceTargetType } from "./evidence/types";

export type GalleryEvidenceLinkType = EvidenceTargetType;

export type GalleryEvidenceLink = {
  type: GalleryEvidenceLinkType;
  id: string;
};

export function normalizeEvidenceLink(
  raw: unknown
): GalleryEvidenceLink | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const record = raw as Record<string, unknown>;
  const type = normalizeEvidenceTargetType(record.type);
  const id = record.id;

  if (!type || isForbiddenEvidenceTargetType(record.type)) {
    return undefined;
  }

  if (typeof id !== "string" || !id.trim()) {
    return undefined;
  }

  const trimmedId = id.trim();
  if (isTransientEvidenceEntityId(trimmedId)) {
    return undefined;
  }

  return { type, id: trimmedId };
}
