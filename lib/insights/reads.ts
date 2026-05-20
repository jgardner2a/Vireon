/**
 * Insights — read adapters for derivation (not source of truth).
 * Re-exports My Home reads; Insights must not import *Store directly.
 */

export {
  getCurrentProperty,
  getIssueById,
  getPropertyForIssue,
  listGalleryMedia,
  listIssues,
  listProperties,
  type GalleryMedia,
  type Issue,
  type Property,
} from "../myHome/reads";

export { listPersistedEvidenceLinks } from "../evidence/persistLinks";
