import { formatEvidenceTargetLabel } from "../labels";
import { hasEvidenceRelationship } from "../queries";
import type { EvidenceLink } from "../types";
import type { VaultImageEntry } from "./types";

export function vaultImageEvidenceRelationship(
  entry: VaultImageEntry
): EvidenceLink | null {
  return entry.evidenceRelationship ?? null;
}

export function vaultImageHasEvidenceRelationship(
  entry: VaultImageEntry
): boolean {
  return hasEvidenceRelationship(vaultImageEvidenceRelationship(entry));
}

export function vaultImageEvidenceTargetLabel(
  entry: VaultImageEntry
): string | null {
  const link = vaultImageEvidenceRelationship(entry);
  if (!link) return null;
  return formatEvidenceTargetLabel(link);
}
