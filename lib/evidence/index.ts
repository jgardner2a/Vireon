/**
 * Evidence — relational layer (source → target links only).
 *
 * - Relationships live in Supabase `evidence_links` (writes: `./persistLinks` only).
 * - Not files, uploads, UI state, analytics, or Vault content.
 * - Vault projections: import `@/lib/evidence/vault` (not this barrel).
 * - Aggregate insights: import `@/lib/insights` (not stores directly).
 */

export type {
  EvidenceEntityType,
  EvidenceEndpoint,
  EvidenceLink,
  EvidenceSourceType,
  EvidenceTargetType,
} from "./types";

export {
  evidenceRelationshipKey,
  normalizeEvidenceRelationship,
} from "./normalize";

export {
  evidenceLinkFromDocument,
  evidenceLinkFromGalleryFolder,
  evidenceLinkFromGalleryMedia,
  evidenceLinkFromGallerySource,
  evidenceLinkToGalleryTarget,
  isGalleryFolderEvidenceLink,
  isGalleryMediaEvidenceLink,
} from "./adapters";

export {
  validateFolderEvidenceAssignment,
  validateMediaEvidenceAssignment,
} from "./assign";

export { isTransientEvidenceEntityId } from "./entityIds";

export {
  validateEvidenceLink,
  type EvidenceLinkValidationContext,
  type EvidenceLinkValidationResult,
} from "./link";

export {
  ALLOWED_EVIDENCE_SOURCE_TYPES,
  canFolderBeEvidenceSource,
  isAllowedEvidenceSourceType,
  isDocumentEvidenceSource,
  isFolderEvidenceSource,
  isMediaEvidenceSource,
  isTransientEvidenceSourceId,
  normalizeEvidenceSourceType,
  validateDocumentEvidenceSource,
  validateEvidenceSource,
  validateFolderEvidenceSource,
  validateMediaEvidenceSource,
  type EvidenceSourceValidationCode,
  type EvidenceSourceValidationContext,
  type EvidenceSourceValidationResult,
} from "./sources";

export {
  ALLOWED_EVIDENCE_TARGET_TYPES,
  isAllowedEvidenceTargetType,
  isForbiddenEvidenceTargetType,
  isIncidentEvidenceTarget,
  isIssueEvidenceTarget,
  isLeaseEvidenceTarget,
  isMaintenanceEvidenceTarget,
  normalizeEvidenceTargetType,
  validateEvidenceTarget,
  validateEvidenceTargetIdentity,
  validateEvidenceTargetOnLink,
  type EvidenceTargetValidationCode,
  type EvidenceTargetValidationContext,
  type EvidenceTargetValidationResult,
} from "./targets";

export { toEmbeddedGalleryEvidenceTarget } from "./persist";

export { listPersistedEvidenceLinks } from "./persistLinks";

export {
  evidenceLinkMatchesTarget,
  evidenceTargetFromLink,
  hasEvidenceRelationship,
} from "./queries";

export {
  formatEvidenceTargetLabel,
  formatEvidenceTargetType,
} from "./labels";

export {
  projectFolderEvidenceLink,
  projectMediaEvidenceLink,
} from "./project";

export {
  isEvidenceLinkOverriddenByFolderRelationship,
  resolveGalleryMediaEvidenceLink,
} from "./resolve";

export {
  galleryMediaMatchesEvidenceTarget,
  getEffectiveEvidenceTarget,
  getEffectiveGalleryMediaEvidenceLink,
  getGalleryFolderEvidenceLink,
  getGalleryMediaEvidenceLink,
  isGalleryMediaEvidenceOverriddenByFolder,
} from "./gallery";

export {
  groupGalleryMediaForEvidenceLink,
  groupGalleryMediaForEvidenceTarget,
  listGalleryMediaForEvidenceLink,
  listGalleryMediaForEvidenceTarget,
  type GalleryEvidenceGroup,
  type GalleryEvidenceGroupSource,
  type LinkedGalleryMediaGroup,
  type LinkedGalleryGroupSource,
} from "./linkedGallery";

export {
  countResolvedTargetEvidence,
  resolveTargetEvidence,
  type ResolvedEvidenceDocument,
  type ResolvedEvidenceFolder,
  type ResolvedEvidenceMedia,
  type ResolvedTargetEvidence,
  type ResolveTargetEvidenceOptions,
} from "./resolveTargetContent";

export {
  ISSUE_CARD_PREVIEW_THUMB_LIMIT,
  buildIssueEvidencePreview,
  buildTargetEvidencePreview,
  collectLinkedGalleryMedia,
  formatEvidenceAttachmentLabel,
  summarizeEvidenceAttachments,
  type EvidenceAttachmentCounts,
  type IssueEvidencePreview,
} from "./issuePreview";
