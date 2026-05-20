import type { VaultEntry } from "@/lib/evidence/vault";

export type VaultCrossLink = {
  href: string;
  label: string;
};

function mediaEntriesForProperty(
  entries: VaultEntry[],
  propertyId: string | null
): VaultEntry[] {
  if (!propertyId) return [];
  return entries.filter(
    (e) => e.type === "image" && e.propertyId === propertyId
  );
}

function issueEntriesForProperty(
  entries: VaultEntry[],
  propertyId: string | null
): VaultEntry[] {
  if (!propertyId) return [];
  return entries.filter(
    (e) => e.type === "issue" && e.propertyId === propertyId
  );
}

/** Read-only navigation links between issues, media, and leases on the same property. */
export function getVaultCrossLinks(
  entry: VaultEntry,
  propertyEntries: VaultEntry[]
): VaultCrossLink[] {
  const links: VaultCrossLink[] = [];
  const propertyId = entry.propertyId;

  if (propertyId) {
    links.push({
      href: `/my-home/properties/${propertyId}`,
      label: "Rental record (lease)",
    });
  }

  if (entry.type === "lease") {
    const issues = issueEntriesForProperty(propertyEntries, propertyId);
    const media = mediaEntriesForProperty(propertyEntries, propertyId);

    if (issues.length > 0) {
      links.push({
        href: `/my-home/issues`,
        label: `${issues.length} linked ${issues.length === 1 ? "issue" : "issues"}`,
      });
    }
    if (media.length > 0) {
      links.push({
        href: `/my-home/gallery`,
        label: `${media.length} linked media`,
      });
    }
    return links;
  }

  if (entry.type === "issue") {
    const media = mediaEntriesForProperty(propertyEntries, propertyId).filter(
      (m) => {
        if (m.type !== "image") return false;
        if (m.imageSource === "gallery") return true;
        return (
          m.issueId != null &&
          String(m.issueId) === String(entry.issueId)
        );
      }
    );

    links.push({
      href: `/my-home/issues/${entry.issueId}`,
      label: "Open issue",
    });

    if (media.length > 0) {
      links.push({
        href: `/my-home/gallery`,
        label: `${media.length} related media`,
      });
    }

    const lease = propertyEntries.find((e) => e.type === "lease");
    if (lease?.type === "lease") {
      links.push({
        href: `/my-home/properties/${propertyId}#lease-${lease.leaseId}`,
        label: "View lease",
      });
    }

    return links;
  }

  if (entry.type === "image") {
    links.push({
      href: `/my-home/gallery`,
      label: "Open gallery",
    });

    const issues = issueEntriesForProperty(propertyEntries, propertyId);
    if (entry.evidenceRelationship?.targetType === "lease" && propertyId) {
      links.push({
        href: `/my-home/properties/${propertyId}#lease-${entry.evidenceRelationship.targetId}`,
        label: "Linked lease",
      });
    }

    if (entry.issueId) {
      links.push({
        href: `/my-home/issues/${entry.issueId}`,
        label: entry.issueTitle
          ? `Issue: ${entry.issueTitle}`
          : "Linked issue",
      });
    } else if (issues.length > 0) {
      const firstIssue = issues.find((e) => e.type === "issue");
      links.push({
        href: firstIssue
          ? `/my-home/issues/${firstIssue.issueId}`
          : "/my-home/issues",
        label: `${issues.length} issues on property`,
      });
    }

    const lease = propertyEntries.find((e) => e.type === "lease");
    if (lease?.type === "lease") {
      links.push({
        href: `/my-home/properties/${propertyId}#lease-${lease.leaseId}`,
        label: "View lease",
      });
    }
  }

  return links;
}
