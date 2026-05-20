/**
 * Central evidence relationship model.
 *
 * EvidenceLink records an association between two existing entities.
 * It does not store media bytes or duplicate gallery items.
 */

/**
 * Persisted entities that may act as evidence sources.
 * Not UI selection state or synthetic vault groupings.
 */
export type EvidenceSourceType = "media" | "folder" | "document";

/**
 * Persisted My Home records that gallery evidence can point to.
 * Not gallery folders or other UI containers.
 */
export type EvidenceTargetType =
  | "issue"
  | "incident"
  | "maintenance"
  | "lease";

export type EvidenceEntityType = EvidenceSourceType | EvidenceTargetType;

/**
 * Directed relationship: source (media, folder, or document) → target
 * (issue, incident, maintenance request, or lease record).
 */
export type EvidenceLink = {
  sourceType: EvidenceSourceType;
  sourceId: string;
  targetType: EvidenceTargetType;
  targetId: string;
};

export type EvidenceEndpoint = {
  type: EvidenceEntityType;
  id: string;
};
