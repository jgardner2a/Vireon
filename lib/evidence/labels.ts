import type { EvidenceLink, EvidenceTargetType } from "./types";

/** Display label for the relationship target (not the gallery source). */
export function formatEvidenceTargetLabel(link: EvidenceLink): string {
  return `${link.targetType} #${link.targetId}`;
}

export function formatEvidenceTargetType(type: EvidenceTargetType): string {
  switch (type) {
    case "issue":
      return "issue";
    case "lease":
      return "lease record";
    case "incident":
      return "incident";
    case "maintenance":
      return "maintenance request";
    default:
      return type;
  }
}
