"use client";

import Link from "next/link";
import { formatEvidenceTargetType } from "@/lib/evidence";
import { IssueStatusBadge } from "../issueStatus";
import {
  groupVaultGalleryByFolder,
  isVaultGalleryImage,
  partitionFeedEntries,
  projectVaultRelationships,
  vaultImageEvidenceRelationship,
  type VaultPropertyFeed,
} from "@/lib/evidence/vault";

type VaultRelationshipMapProps = {
  feeds: VaultPropertyFeed[];
};

export function VaultRelationshipMap({ feeds }: VaultRelationshipMapProps) {
  const maps = projectVaultRelationships(feeds);

  if (maps.length === 0) {
    return null;
  }

  return (
    <section
      className="vault-relationships vault-relationships--full"
      aria-label="Evidence relationship map"
    >
      <header className="vault-relationships__header">
        <h2 className="my-home-section-title">Relationship map</h2>
        <p className="my-home-text-muted">
          Read-only view of gallery folders, nested media, and links to issues
          and leases.
        </p>
      </header>

      <section className="vault-relationships__properties">
        {feeds.map((feed) => {
          const map = maps.find(
            (m) => m.propertyId === feed.propertyId
          );
          const { gallery } = partitionFeedEntries(feed.entries);
          const folderContainers = groupVaultGalleryByFolder(gallery);

          return (
            <article
              key={feed.propertyId ?? "unlinked"}
              className="vault-relationships-property"
            >
              <header className="vault-relationships-property__header">
                <h3 className="vault-relationships-property__title">
                  {feed.propertyName}
                </h3>
                {map?.lease ? (
                  <p className="my-home-text-muted">
                    Lease:{" "}
                    {feed.propertyId ? (
                      <Link
                        href={`/my-home/properties/${feed.propertyId}#lease-${map.lease.id}`}
                      >
                        {map.lease.title}
                      </Link>
                    ) : (
                      map.lease.title
                    )}
                  </p>
                ) : (
                  <p className="my-home-text-muted">No lease record</p>
                )}
              </header>

              {folderContainers.length > 0 ? (
                <section className="vault-relationships-property__section">
                  <h4 className="my-home-label">Gallery folders</h4>
                  <ul className="vault-relationships-folders">
                    {folderContainers.map((container) => (
                      <li
                        key={container.folderId}
                        className="vault-relationships-folder"
                      >
                        <header className="vault-relationships-folder__head">
                          <span className="vault-relationships-folder__name">
                            {container.folderName}
                          </span>
                          <span className="my-home-text-muted">
                            {container.media.length} media
                          </span>
                        </header>
                        {container.folderEvidenceLabel ? (
                          <p className="vault-relationships-folder__evidence">
                            <strong>Folder is assigned as Evidence</strong>
                            <span> — {container.folderEvidenceLabel}</span>
                          </p>
                        ) : null}
                        <ul className="vault-relationships__list vault-relationships__list--nested">
                          {container.media.map((entry) => (
                            <li
                              key={entry.id}
                              className="vault-relationships__edge"
                            >
                              <span className="vault-relationships__edge-media">
                                {entry.caption}
                              </span>
                              {vaultImageEvidenceRelationship(entry) ? (
                                <>
                                  <span
                                    className="vault-relationships__edge-arrow"
                                    aria-hidden
                                  >
                                    →
                                  </span>
                                  <span className="vault-relationships__edge-target">
                                    {(() => {
                                      const rel =
                                        vaultImageEvidenceRelationship(entry)!;
                                      return (
                                        <>
                                          {formatEvidenceTargetType(
                                            rel.targetType
                                          )}
                                          {rel.targetType === "issue" &&
                                          entry.issueId ? (
                                            <>
                                              {": "}
                                              <Link
                                                href={`/my-home/issues/${entry.issueId}`}
                                              >
                                                {entry.issueTitle ??
                                                  `Issue #${rel.targetId}`}
                                              </Link>
                                            </>
                                          ) : null}
                                          {rel.targetType === "lease" &&
                                          feed.propertyId ? (
                                            <>
                                              {": "}
                                              <Link
                                                href={`/my-home/properties/${feed.propertyId}#lease-${rel.targetId}`}
                                              >
                                                Lease
                                              </Link>
                                            </>
                                          ) : null}
                                        </>
                                      );
                                    })()}
                                  </span>
                                </>
                              ) : (
                                <span className="my-home-text-muted">
                                  — no link
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="vault-relationships-property__section">
                <h4 className="my-home-label">Issues ↔ media</h4>
                {!map || map.issues.length === 0 ? (
                  <p className="my-home-text-muted">No issues on this property.</p>
                ) : (
                  <ul className="vault-relationships-issues">
                    {map.issues.map((issue) => (
                      <li key={issue.id} className="vault-relationships-issue">
                        <section className="vault-relationships-issue__head">
                          <Link
                            href={`/my-home/issues/${issue.id}`}
                            className="vault-relationships-issue__title"
                          >
                            {issue.title}
                          </Link>
                          <IssueStatusBadge status={issue.status} />
                        </section>
                        <p className="my-home-text-muted">
                          {issue.linkedMediaCount} linked gallery{" "}
                          {issue.linkedMediaCount === 1 ? "item" : "items"}{" "}
                          (effective, including folder assignments)
                        </p>
                        {issue.linkedMediaCount > 0 && map ? (
                          <ul className="vault-relationships__list vault-relationships__list--nested">
                            {map.mediaIssueLinks
                              .filter((edge) => edge.issueId === issue.id)
                              .map((edge) => {
                                const entry = feed.entries.find(
                                  (e) =>
                                    isVaultGalleryImage(e) &&
                                    e.id === edge.mediaEntryId
                                );
                                const folderName = entry
                                  ? folderContainers.find((c) =>
                                      c.media.some((m) => m.id === entry.id)
                                    )?.folderName
                                  : null;
                                return (
                                  <li
                                    key={edge.mediaEntryId}
                                    className="vault-relationships__edge"
                                  >
                                    <span className="vault-relationships__edge-media">
                                      {edge.mediaCaption}
                                      {folderName ? (
                                        <span className="my-home-text-muted">
                                          {" "}
                                          · {folderName}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span
                                      className="vault-relationships__edge-arrow"
                                      aria-hidden
                                    >
                                      ↔
                                    </span>
                                    <span className="vault-relationships__edge-target">
                                      This issue
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {map && map.mediaLeaseLinks.length > 0 ? (
                <section className="vault-relationships-property__section">
                  <h4 className="my-home-label">Media ↔ lease</h4>
                  <ul className="vault-relationships__list">
                    {map.mediaLeaseLinks.map((edge) => (
                      <li
                        key={edge.mediaEntryId}
                        className="vault-relationships__edge"
                      >
                        <span className="vault-relationships__edge-media">
                          {edge.mediaCaption}
                        </span>
                        <span
                          className="vault-relationships__edge-arrow"
                          aria-hidden
                        >
                          ↔
                        </span>
                        {feed.propertyId ? (
                          <Link
                            href={`/my-home/properties/${feed.propertyId}#lease-${edge.leaseId}`}
                            className="vault-relationships__edge-target"
                          >
                            {edge.leaseTitle}
                          </Link>
                        ) : (
                          <span>{edge.leaseTitle}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {folderContainers.length === 0 &&
              map &&
              map.mediaIssueLinks.length === 0 &&
              map.mediaLeaseLinks.length === 0 ? (
                <p className="my-home-text-muted">
                  No gallery media linked to issues or leases for this property.
                </p>
              ) : null}
            </article>
          );
        })}
      </section>
    </section>
  );
}
