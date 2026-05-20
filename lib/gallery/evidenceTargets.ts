import type { EvidenceTargetType } from "../evidence/types";
import { listIncidentsByPropertyId } from "../incidentsStore";
import { listIssuesByPropertyId } from "../issuesStore";
import { getLeaseByPropertyId } from "../leasesStore";

/** Picker option when assigning evidence from Gallery (write flow). */
export type GalleryEvidenceTargetOption = {
  key: string;
  type: EvidenceTargetType;
  id: string;
  label: string;
  detail?: string;
};

export function galleryEvidenceTargetKey(
  type: EvidenceTargetType,
  id: string
) {
  return `${type}:${id}`;
}

export function buildGalleryEvidenceTargets(
  propertyId: number | string
): GalleryEvidenceTargetOption[] {
  const list: GalleryEvidenceTargetOption[] = [];

  for (const issue of listIssuesByPropertyId(Number(propertyId))) {
    list.push({
      key: galleryEvidenceTargetKey("issue", String(issue.id)),
      type: "issue",
      id: String(issue.id),
      label: issue.title,
      detail: issue.status,
    });
  }

  const lease = getLeaseByPropertyId(Number(propertyId));
  if (lease) {
    list.push({
      key: galleryEvidenceTargetKey("lease", String(lease.id)),
      type: "lease",
      id: String(lease.id),
      label: lease.title,
      detail: `Started ${lease.startDate}`,
    });
  }

  for (const incident of listIncidentsByPropertyId(Number(propertyId))) {
    list.push({
      key: galleryEvidenceTargetKey("incident", String(incident.id)),
      type: "incident",
      id: String(incident.id),
      label: incident.title,
      detail: incident.notes || undefined,
    });
  }

  return list;
}
