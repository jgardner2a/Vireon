import type {
  VaultImageEntry,
  VaultIssueEntry,
  VaultLeaseEntry,
  VaultMediaIssueRelationship,
  VaultMediaLeaseRelationship,
  VaultPropertyFeed,
  VaultPropertyRelationships,
} from "./types";

/**
 * Groups resolved EvidenceLinks into per-property relationship maps for visualization.
 * Operates only on vault projections — no store writes.
 */
export function projectVaultRelationships(
  feeds: VaultPropertyFeed[]
): VaultPropertyRelationships[] {
  return feeds.map((feed) => {
    const issues = feed.entries.filter(
      (e): e is VaultIssueEntry => e.type === "issue"
    );
    const images = feed.entries.filter(
      (e): e is VaultImageEntry => e.type === "image"
    );
    const leaseEntry = feed.entries.find(
      (e): e is VaultLeaseEntry => e.type === "lease"
    );

    const issueById = new Map(
      issues.map((issue) => [String(issue.issueId), issue])
    );

    const mediaIssueLinks: VaultMediaIssueRelationship[] = [];
    const mediaLeaseLinks: VaultMediaLeaseRelationship[] = [];

    for (const image of images) {
      if (image.imageSource !== "gallery") continue;

      const link = image.evidenceRelationship;
      if (link?.targetType === "issue") {
        const issue = issueById.get(link.targetId);
        mediaIssueLinks.push({
          mediaEntryId: image.id,
          mediaCaption: image.caption,
          issueId: link.targetId,
          issueTitle: issue?.title ?? `Issue #${link.targetId}`,
        });
        continue;
      }

      if (link?.targetType === "lease" && leaseEntry) {
        mediaLeaseLinks.push({
          mediaEntryId: image.id,
          mediaCaption: image.caption,
          leaseId: link.targetId,
          leaseTitle: leaseEntry.title,
        });
        continue;
      }

      if (link?.targetType === "incident" || link?.targetType === "maintenance") {
        continue;
      }

      if (image.issueId != null) {
        const issueKey = String(image.issueId);
        const issue = issueById.get(issueKey);
        if (issue) {
          mediaIssueLinks.push({
            mediaEntryId: image.id,
            mediaCaption: image.caption,
            issueId: issueKey,
            issueTitle: issue.title,
          });
        }
      }
    }

    const linkedCountByIssue = new Map<string, number>();
    for (const edge of mediaIssueLinks) {
      linkedCountByIssue.set(
        edge.issueId,
        (linkedCountByIssue.get(edge.issueId) ?? 0) + 1
      );
    }

    return {
      propertyId: feed.propertyId,
      propertyName: feed.propertyName,
      lease: leaseEntry
        ? { id: String(leaseEntry.leaseId), title: leaseEntry.title }
        : null,
      issues: issues.map((issue) => ({
        id: String(issue.issueId),
        title: issue.title,
        status: issue.status,
        linkedMediaCount:
          linkedCountByIssue.get(String(issue.issueId)) ?? 0,
      })),
      mediaIssueLinks,
      mediaLeaseLinks,
    };
  });
}
