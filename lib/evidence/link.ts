import type {
  EvidenceSourceValidationContext,
  EvidenceSourceValidationResult,
} from "./sources";
import { validateEvidenceSource } from "./sources";
import type {
  EvidenceTargetValidationContext,
  EvidenceTargetValidationResult,
} from "./targets";
import { validateEvidenceTargetOnLink } from "./targets";
import type { EvidenceLink } from "./types";

export type EvidenceLinkValidationContext = EvidenceSourceValidationContext &
  EvidenceTargetValidationContext;

export type EvidenceLinkValidationResult =
  | EvidenceSourceValidationResult
  | EvidenceTargetValidationResult;

export function validateEvidenceLink(
  link: EvidenceLink,
  context: EvidenceLinkValidationContext = {}
): EvidenceLinkValidationResult {
  const source = validateEvidenceSource(
    link.sourceType,
    link.sourceId,
    context
  );
  if (!source.ok) {
    return source;
  }

  return validateEvidenceTargetOnLink(link, context);
}
