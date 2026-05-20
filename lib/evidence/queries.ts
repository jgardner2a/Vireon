import type { EvidenceLink, EvidenceTargetType } from "./types";

export function hasEvidenceRelationship(
  link: EvidenceLink | null | undefined
): link is EvidenceLink {
  return link != null;
}

export function evidenceLinkMatchesTarget(
  link: EvidenceLink,
  targetType: EvidenceTargetType,
  targetId: string | number
): boolean {
  return (
    link.targetType === targetType &&
    link.targetId === String(targetId)
  );
}

export function evidenceTargetFromLink(
  link: EvidenceLink
): { type: EvidenceTargetType; id: string } {
  return { type: link.targetType, id: link.targetId };
}
