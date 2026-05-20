"use client";

import {
  formatVaultDate,
  groupVaultGalleryByFolder,
  partitionFeedEntries,
  type VaultEntry,
  type VaultPropertyFeed,
} from "@/lib/evidence/vault";

type VaultTimelinePreviewProps = {
  feeds: VaultPropertyFeed[];
  /** Max entries shown inside each collapsed property section */
  maxEntriesPerFeed?: number;
};

function entryPreviewLine(entry: VaultEntry): string {
  if (entry.type === "lease") {
    return `Lease · ${entry.title}`;
  }
  if (entry.type === "issue") {
    return `Issue · ${entry.title} (${entry.status})`;
  }
  const kind = entry.imageUrl.startsWith("data:video/") ? "Video" : "Media";
  if (
    entry.imageSource === "gallery" &&
    entry.evidenceRelationship?.targetType === "issue"
  ) {
    return `${kind} ↔ Issue · ${entry.caption}`;
  }
  if (
    entry.imageSource === "gallery" &&
    entry.evidenceRelationship?.targetType === "lease"
  ) {
    return `${kind} ↔ Lease · ${entry.caption}`;
  }
  return `${kind} · ${entry.caption}`;
}

export function VaultTimelinePreview({
  feeds,
  maxEntriesPerFeed = 3,
}: VaultTimelinePreviewProps) {
  if (feeds.length === 0) {
    return null;
  }

  return (
    <section className="vault-preview" aria-label="Timeline preview">
      <header className="vault-preview__header">
        <h2 className="my-home-section-title">Timeline preview</h2>
        <p className="my-home-text-muted">
          Collapsed view of recent evidence. Upgrade to Pro for the full
          timeline.
        </p>
      </header>

      <div className="vault-preview__feeds">
        {feeds.map((feed) => {
          const { timeline, gallery } = partitionFeedEntries(feed.entries);
          const preview = timeline.slice(0, maxEntriesPerFeed);
          const remaining = timeline.length - preview.length;
          const folderContainers = groupVaultGalleryByFolder(gallery);

          return (
            <details key={feed.propertyId ?? "unlinked"} className="vault-preview-feed">
              <summary className="vault-preview-feed__summary">
                <span className="vault-preview-feed__name">
                  {feed.propertyName}
                </span>
                <span className="vault-preview-feed__count">
                  {feed.entries.length}{" "}
                  {feed.entries.length === 1 ? "entry" : "entries"}
                </span>
              </summary>

              <ol className="vault-preview-feed__list">
                {preview.map((entry) => (
                  <li key={entry.id} className="vault-preview-feed__item">
                    <span className="vault-preview-feed__line">
                      {entryPreviewLine(entry)}
                    </span>
                    <time
                      className="vault-preview-feed__date"
                      dateTime={entry.occurredAt}
                    >
                      {formatVaultDate(entry.occurredAt)}
                    </time>
                  </li>
                ))}
                {remaining > 0 ? (
                  <li className="vault-preview-feed__more">
                    +{remaining} more timeline{" "}
                    {remaining === 1 ? "entry" : "entries"} on Pro
                  </li>
                ) : null}
              </ol>

              {folderContainers.length > 0 ? (
                <ul className="vault-preview-feed__folders">
                  {folderContainers.map((container) => (
                    <li
                      key={container.folderId}
                      className="vault-preview-feed__folder"
                    >
                      <span className="vault-preview-feed__folder-name">
                        Folder: {container.folderName}
                      </span>
                      <span className="vault-preview-feed__folder-meta">
                        {container.media.length} media
                        {container.folderEvidenceLabel
                          ? ` · evidence ${container.folderEvidenceLabel}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </details>
          );
        })}
      </div>
    </section>
  );
}
