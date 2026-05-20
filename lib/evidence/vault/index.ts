/**
 * Evidence Vault — read-only visualization layer.
 *
 * Responsibilities:
 * - Resolve EvidenceLinks from My Home stores (gallery, folders, issues, leases)
 * - Project grouped relationship maps and timeline feeds for UI
 * - Surface associated gallery media (and documents when a document store exists)
 *
 * This module MUST NOT:
 * - Create or modify evidence relationships
 * - Persist vault-specific data (no localStorage keys here)
 *
 * Evidence writes belong only in My Home Gallery → `@/lib/gallery` → `evidence/persistLinks`.
 */

export type {
  VaultEntry,
  VaultEntryType,
  VaultExportBundle,
  VaultExportMeta,
  VaultFolderContainer,
  VaultImageEntry,
  VaultImageSource,
  VaultIssueEntry,
  VaultLeaseEntry,
  VaultMediaIssueRelationship,
  VaultMediaLeaseRelationship,
  VaultPropertyFeed,
  VaultPropertyRelationships,
  VaultSummary,
} from "./types";

export {
  buildVaultEntries,
  buildVaultExportBundle,
  formatVaultDate,
  vaultSummary,
} from "./build";

export {
  enrichFeedsWithAddresses,
  filterFeedsByProperty,
  groupVaultByProperty,
} from "./feeds";

export { projectVaultRelationships } from "./relationships";

export {
  groupVaultGalleryByFolder,
  isVaultGalleryImage,
  partitionFeedEntries,
} from "./folders";

export {
  resolveVaultFolderLink,
  resolveVaultGalleryMediaLink,
} from "./resolve";

export {
  vaultImageEvidenceRelationship,
  vaultImageEvidenceTargetLabel,
  vaultImageHasEvidenceRelationship,
} from "./display";
