"use client";

import Link from "next/link";
import {
  groupVaultGalleryByFolder,
  partitionFeedEntries,
  projectVaultRelationships,
  type VaultPropertyFeed,
} from "@/lib/evidence/vault";

const FREE_PREVIEW_LINK_LIMIT = 5;

type VaultRelationshipPreviewProps = {
  feeds: VaultPropertyFeed[];
};

export function VaultRelationshipPreview({
  feeds,
}: VaultRelationshipPreviewProps) {
  const maps = projectVaultRelationships(feeds);
  const folderCount = feeds.reduce((n, feed) => {
    const { gallery } = partitionFeedEntries(feed.entries);
    return n + groupVaultGalleryByFolder(gallery).length;
  }, 0);
  const allMediaIssueLinks = maps.flatMap((m) => m.mediaIssueLinks);
  const totalIssueLinks = allMediaIssueLinks.length;
  const previewLinks = allMediaIssueLinks.slice(0, FREE_PREVIEW_LINK_LIMIT);
  const hiddenCount = Math.max(0, totalIssueLinks - previewLinks.length);

  if (totalIssueLinks === 0 && maps.every((m) => m.mediaLeaseLinks.length === 0)) {
    return (
      <section
        className="vault-relationships vault-relationships--preview"
        aria-label="Evidence relationships preview"
      >
        <header className="vault-relationships__header">
          <h2 className="my-home-section-title">Evidence relationships</h2>
          <p className="my-home-text-muted">
            No gallery media linked to issues or leases yet. Assign evidence in
            Gallery to see relationships here.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section
      className="vault-relationships vault-relationships--preview"
      aria-label="Evidence relationships preview"
    >
      <header className="vault-relationships__header">
        <h2 className="my-home-section-title">Evidence relationships</h2>
        <p className="my-home-text-muted">
          Limited preview of gallery folders, nested media, and issue links.
          Upgrade to Pro for the full relationship map and timeline.
        </p>
      </header>

      <p className="vault-relationships__stat">
        <strong>{folderCount}</strong> gallery folder
        {folderCount === 1 ? "" : "s"} · <strong>{totalIssueLinks}</strong> media
        ↔ issue {totalIssueLinks === 1 ? "link" : "links"}
        {maps.some((m) => m.mediaLeaseLinks.length > 0)
          ? ` · ${maps.reduce((n, m) => n + m.mediaLeaseLinks.length, 0)} media ↔ lease`
          : ""}
      </p>

      {previewLinks.length > 0 ? (
        <ul className="vault-relationships__list">
          {previewLinks.map((edge) => (
            <li key={edge.mediaEntryId} className="vault-relationships__edge">
              <span className="vault-relationships__edge-media">
                {edge.mediaCaption}
              </span>
              <span className="vault-relationships__edge-arrow" aria-hidden>
                ↔
              </span>
              <Link
                href={`/my-home/issues/${edge.issueId}`}
                className="vault-relationships__edge-target"
              >
                {edge.issueTitle}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {hiddenCount > 0 ? (
        <p className="my-home-text-muted vault-relationships__more">
          +{hiddenCount} more media ↔ issue{" "}
          {hiddenCount === 1 ? "link" : "links"} on Pro
        </p>
      ) : null}
    </section>
  );
}
