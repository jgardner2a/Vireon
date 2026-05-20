/**
 * Places-facing insight snapshot.
 * Places UI must consume ONLY this module for renter-derived data (never stores/Evidence).
 */

import {
  listIssues,
  listPersistedEvidenceLinks,
  listProperties,
} from "./reads";

export type PlacesPropertyInsight = {
  propertyId: string;
  propertyName: string;
  evidenceLinkCount: number;
};

export type PlacesInsightsSnapshot = {
  totalEvidenceLinks: number;
  byProperty: PlacesPropertyInsight[];
};

/** Read-only aggregate for map/listing overlays. */
export function buildPlacesInsightsSnapshot(): PlacesInsightsSnapshot {
  const links = listPersistedEvidenceLinks();
  const issueToProperty = new Map(
    listIssues().map((i) => [String(i.id), String(i.propertyId)])
  );
  const nameById = new Map(
    listProperties().map((p) => [String(p.id), p.name])
  );
  const byProperty = new Map<string, number>();

  for (const link of links) {
    const propertyId =
      link.targetType === "issue"
        ? issueToProperty.get(link.targetId)
        : undefined;
    if (!propertyId) continue;
    byProperty.set(propertyId, (byProperty.get(propertyId) ?? 0) + 1);
  }

  return {
    totalEvidenceLinks: links.length,
    byProperty: Array.from(byProperty.entries()).map(
      ([propertyId, evidenceLinkCount]) => ({
        propertyId,
        propertyName: nameById.get(propertyId) ?? "Property",
        evidenceLinkCount,
      })
    ),
  };
}
