import { isTransientEvidenceEntityId } from "./entityIds";
import { normalizeEvidenceSourceType } from "./sources";
import {
  isForbiddenEvidenceTargetType,
  normalizeEvidenceTargetType,
} from "./targets";
import type { EvidenceLink } from "./types";

function trimId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

/** Parses a persisted or API-shaped relationship record. */
export function normalizeEvidenceRelationship(
  raw: unknown
): EvidenceLink | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const record = raw as Record<string, unknown>;
  const sourceType = normalizeEvidenceSourceType(record.sourceType);
  const targetType = normalizeEvidenceTargetType(record.targetType);
  const sourceId = trimId(record.sourceId);
  const targetId = trimId(record.targetId);

  if (!sourceType || !targetType) {
    return undefined;
  }
  if (isForbiddenEvidenceTargetType(record.targetType)) {
    return undefined;
  }
  if (!sourceId || !targetId) {
    return undefined;
  }
  if (isTransientEvidenceEntityId(sourceId)) {
    return undefined;
  }
  if (isTransientEvidenceEntityId(targetId)) {
    return undefined;
  }

  return {
    sourceType,
    sourceId,
    targetType,
    targetId,
  };
}

/** Stable key for deduplicating relationships in memory. */
export function evidenceRelationshipKey(link: EvidenceLink): string {
  return `${link.sourceType}:${link.sourceId}->${link.targetType}:${link.targetId}`;
}
