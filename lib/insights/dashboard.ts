import { dashboardShowsRentalHistory } from "../permissions";
import type { UserPlan } from "../subscription/subscription";
import {
  getCurrentProperty,
  getPropertyForIssue,
  listGalleryMedia,
  listIssues,
  listPersistedEvidenceLinks,
  listProperties,
  type Issue,
  type Property,
} from "./reads";

export type DashboardActivityType = "issue" | "media" | "property";

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  title: string;
  subtitle: string;
  occurredAt: string;
  href: string;
  propertyId?: string;
  propertyName?: string;
};

export type PropertySummary = {
  property: Property;
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  mediaCount: number;
  evidenceLinkCount: number;
};

export type DashboardModel = {
  isMultiProperty: boolean;
  properties: Property[];
  propertySummaries: PropertySummary[];
  activeIssues: Issue[];
  recentActivity: DashboardActivity[];
  totals: {
    properties: number;
    openIssues: number;
    totalIssues: number;
    mediaCount: number;
    evidenceLinkCount: number;
  };
};

function propertyIdSet(properties: Property[]): Set<string> {
  return new Set(properties.map((p) => String(p.id)));
}

function countLinksForProperties(
  propertyIds: Set<string>,
  issues: Issue[]
): Map<string, number> {
  const issueToProperty = new Map(
    issues.map((i) => [String(i.id), String(i.propertyId)])
  );
  const counts = new Map<string, number>();
  for (const link of listPersistedEvidenceLinks()) {
    const propertyId = issueToProperty.get(link.targetId);
    if (!propertyId || !propertyIds.has(propertyId)) continue;
    counts.set(propertyId, (counts.get(propertyId) ?? 0) + 1);
  }
  return counts;
}

export function getDashboardProperties(plan: UserPlan): {
  properties: Property[];
  isMultiProperty: boolean;
} {
  const all = listProperties();

  if (dashboardShowsRentalHistory(plan)) {
    return { properties: all, isMultiProperty: all.length > 1 };
  }

  const current = getCurrentProperty();
  return {
    properties: current ? [current] : [],
    isMultiProperty: false,
  };
}

function buildPropertySummary(
  property: Property,
  issues: Issue[],
  mediaCount: number,
  evidenceLinkCount: number
): PropertySummary {
  const openIssues = issues.filter((i) => i.status === "Open").length;
  const inProgressIssues = issues.filter(
    (i) => i.status === "In Progress"
  ).length;

  return {
    property,
    totalIssues: issues.length,
    openIssues,
    inProgressIssues,
    mediaCount,
    evidenceLinkCount,
  };
}

function buildActivityFeed(
  properties: Property[],
  issues: Issue[],
  media: ReturnType<typeof listGalleryMedia>
): DashboardActivity[] {
  const nameById = new Map(
    properties.map((p) => [String(p.id), p.name])
  );

  const activities: DashboardActivity[] = [];

  for (const issue of issues) {
    const property = getPropertyForIssue(issue);
    activities.push({
      id: `issue:${issue.id}`,
      type: "issue",
      title: issue.title,
      subtitle: `${issue.status} · ${property?.name ?? "Unknown property"}`,
      occurredAt: issue.createdAt,
      href: `/my-home/issues/${issue.id}`,
      propertyId: issue.propertyId,
      propertyName: property?.name,
    });
  }

  for (const item of media) {
    const propertyName = nameById.get(String(item.propertyId));
    activities.push({
      id: `media:${item.id}`,
      type: "media",
      title: item.type === "video" ? "Video uploaded" : "Image uploaded",
      subtitle: `${item.name}${propertyName ? ` · ${propertyName}` : ""}`,
      occurredAt: item.createdAt,
      href: "/my-home/gallery",
      propertyId: item.propertyId || undefined,
      propertyName,
    });
  }

  return activities
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 12);
}

/** Dashboard aggregate — derivation only; not persisted. */
export function buildDashboardModel(plan: UserPlan): DashboardModel {
  const { properties, isMultiProperty } = getDashboardProperties(plan);
  const ids = propertyIdSet(properties);

  const scopedIssues = listIssues().filter((issue) =>
    ids.has(String(issue.propertyId))
  );

  const scopedMedia = listGalleryMedia().filter((item) =>
    item.propertyId ? ids.has(String(item.propertyId)) : false
  );

  const linkCountsByProperty = countLinksForProperties(ids, scopedIssues);
  const evidenceLinkCount = listPersistedEvidenceLinks().length;

  const propertySummaries = properties.map((property) =>
    buildPropertySummary(
      property,
      scopedIssues.filter((i) => String(i.propertyId) === String(property.id)),
      scopedMedia.filter((m) => String(m.propertyId) === String(property.id))
        .length,
      linkCountsByProperty.get(String(property.id)) ?? 0
    )
  );

  const activeIssues = scopedIssues
    .filter((issue) => issue.status !== "Resolved")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const recentActivity = buildActivityFeed(
    properties,
    scopedIssues,
    scopedMedia
  );

  return {
    isMultiProperty,
    properties,
    propertySummaries,
    activeIssues,
    recentActivity,
    totals: {
      properties: properties.length,
      openIssues: scopedIssues.filter((i) => i.status === "Open").length,
      totalIssues: scopedIssues.length,
      mediaCount: scopedMedia.length,
      evidenceLinkCount,
    },
  };
}
