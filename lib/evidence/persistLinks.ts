/**
 * Evidence — sole write gateway for evidence_links (Supabase).
 *
 * My Home must assign links via lib/gallery/evidence.ts → gallery stores → here.
 * Vault, Insights, and Places must NEVER import this module.
 */

import type { EvidenceLink } from "./types";

export {
  clearEvidenceLink,
  listPersistedEvidenceLinks,
  upsertEvidenceLink,
} from "../data/evidence";

export type { EvidenceLink };
