import type { GalleryEvidenceLink } from "../galleryEvidenceLink";
import { evidenceLinkToGalleryTarget } from "./adapters";
import type { EvidenceLink } from "./types";

/** Converts a relationship or legacy target payload for embedded gallery storage. */
export function toEmbeddedGalleryEvidenceTarget(
  link: EvidenceLink | GalleryEvidenceLink | null
): GalleryEvidenceLink | null {
  if (link === null) return null;

  if ("sourceType" in link) {
    return evidenceLinkToGalleryTarget(link) ?? null;
  }

  return link;
}
