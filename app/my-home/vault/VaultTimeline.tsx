"use client";

import Link from "next/link";
import { IssueStatusBadge } from "../issueStatus";
import { card, listCardBody, listCardTitle, meta } from "../ui";
import { VaultEntryLinks } from "./VaultEntryLinks";
import { VaultEvidenceRelationshipInline } from "./VaultEvidenceRelationshipInline";
import { VaultFolderEvidenceSection } from "./VaultFolderEvidenceSection";
import {
  formatVaultDate,
  partitionFeedEntries,
  type VaultEntry,
  type VaultPropertyFeed,
} from "@/lib/evidence/vault";

type VaultTimelineProps = {
  feeds: VaultPropertyFeed[];
  showCrossLinks?: boolean;
};

export function VaultTimeline({
  feeds,
  showCrossLinks = false,
}: VaultTimelineProps) {
  if (feeds.length === 0) {
    return null;
  }

  return (
    <div className="vault-timeline-root">
      {feeds.map((feed) => (
        <PropertyFeed
          key={feed.propertyId ?? "unlinked"}
          feed={feed}
          showCrossLinks={showCrossLinks}
        />
      ))}
    </div>
  );
}

function PropertyFeed({
  feed,
  showCrossLinks,
}: {
  feed: VaultPropertyFeed;
  showCrossLinks: boolean;
}) {
  const { timeline, gallery } = partitionFeedEntries(feed.entries);

  return (
    <section className="vault-timeline-feed">
      <header className="vault-timeline-feed__header">
        {feed.propertyId ? (
          <Link
            href={`/my-home/properties/${feed.propertyId}`}
            className="vault-feed-title"
          >
            {feed.propertyName}
          </Link>
        ) : (
          <h2 className="vault-feed-title">{feed.propertyName}</h2>
        )}
        {feed.propertyAddress ? (
          <p className="vault-feed-subtitle">{feed.propertyAddress}</p>
        ) : null}
        <p className="my-home-text-muted" style={{ marginTop: 6 }}>
          {feed.entries.length} vault{" "}
          {feed.entries.length === 1 ? "entry" : "entries"}
          {gallery.length > 0
            ? ` · ${gallery.length} gallery item${gallery.length === 1 ? "" : "s"} in folders`
            : ""}
        </p>
      </header>

      {timeline.length > 0 ? (
        <ol className="vault-timeline">
          {timeline.map((entry) => (
            <li key={entry.id} className="vault-timeline-item">
              <VaultTimelineEntry
                entry={entry}
                propertyEntries={feed.entries}
                showCrossLinks={showCrossLinks}
              />
            </li>
          ))}
        </ol>
      ) : null}

      <VaultFolderEvidenceSection
        galleryEntries={gallery}
        propertyEntries={feed.entries}
        showCrossLinks={showCrossLinks}
      />
    </section>
  );
}

function VaultTimelineEntry({
  entry,
  propertyEntries,
  showCrossLinks,
}: {
  entry: VaultEntry;
  propertyEntries: VaultEntry[];
  showCrossLinks: boolean;
}) {
  const dateLabel = formatVaultDate(entry.occurredAt);

  if (entry.type === "lease") {
    return (
      <div className="vault-timeline-card vault-timeline-card--lease" style={card}>
        <div className="vault-entry-header">
          <span className="vault-entry-type vault-entry-type--lease">Lease</span>
          <time className="my-home-text-muted" dateTime={entry.occurredAt}>
            {dateLabel}
          </time>
        </div>
        <h3 className="vault-lease-title">{entry.title}</h3>
        <p className="my-home-body-text" style={{ marginTop: 8 }}>
          {entry.startDate}
          {entry.endDate ? ` → ${entry.endDate}` : " → ongoing"}
        </p>
        {showCrossLinks ? (
          <VaultEntryLinks entry={entry} propertyEntries={propertyEntries} />
        ) : null}
      </div>
    );
  }

  if (entry.type === "issue") {
    return (
      <div className="vault-timeline-card" style={card}>
        <div className="vault-entry-header">
          <span className="vault-entry-type">Issue</span>
          <time className="my-home-text-muted" dateTime={entry.occurredAt}>
            {dateLabel}
          </time>
        </div>
        <Link
          href={`/my-home/issues/${entry.issueId}`}
          className="vault-timeline-issue-link"
        >
          <div className="my-home-row-between" style={{ marginTop: 10 }}>
            <span style={listCardTitle}>{entry.title}</span>
            <IssueStatusBadge status={entry.status} />
          </div>
          <p style={{ ...listCardBody, marginTop: 8 }}>{entry.description}</p>
        </Link>
        {entry.imageCount > 0 ? (
          <p className="my-home-text-muted" style={{ marginTop: 10 }}>
            {entry.imageCount} linked gallery{" "}
            {entry.imageCount === 1 ? "item" : "items"}
          </p>
        ) : null}
        {showCrossLinks ? (
          <VaultEntryLinks entry={entry} propertyEntries={propertyEntries} />
        ) : null}
      </div>
    );
  }

  if (entry.type === "image" && entry.imageSource === "gallery") {
    return null;
  }

  return (
    <div className="vault-timeline-card" style={card}>
      <div className="vault-entry-header">
        <span className="vault-entry-type vault-entry-type--image">
          {entry.imageUrl.startsWith("data:video/") ? "Video" : "Media"}
        </span>
        <time className="my-home-text-muted" dateTime={entry.occurredAt}>
          {dateLabel}
        </time>
      </div>
      <p style={{ ...meta, margin: "10px 0 12px" }}>{entry.caption}</p>
      <div style={{ marginBottom: 12 }}>
        <VaultEvidenceRelationshipInline
          entry={entry}
          className="vault-relationships__edge-inline"
          ifEmpty={null}
        />
      </div>
      {entry.imageUrl.startsWith("data:video/") ? (
        <video
          src={entry.imageUrl}
          className="vault-timeline-thumb"
          controls
          preload="metadata"
        />
      ) : (
        <img src={entry.imageUrl} alt="" className="vault-timeline-thumb" />
      )}
      {showCrossLinks ? (
        <VaultEntryLinks entry={entry} propertyEntries={propertyEntries} />
      ) : null}
    </div>
  );
}
