"use client";

import Link from "next/link";
import { IssueStatusBadge } from "../issueStatus";
import { card, listCardBody, listCardTitle, meta } from "../ui";
import { formatVaultDate } from "./buildVault";
import type { VaultEntry, VaultPropertyFeed } from "./types";

export function VaultTimeline({ feeds }: { feeds: VaultPropertyFeed[] }) {
  if (feeds.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {feeds.map((feed) => (
        <PropertyFeed key={feed.propertyId ?? "unlinked"} feed={feed} />
      ))}
    </div>
  );
}

function PropertyFeed({ feed }: { feed: VaultPropertyFeed }) {
  return (
    <section>
      <header style={{ marginBottom: 20 }}>
        {feed.propertyId ? (
          <Link
            href={`/my-home/properties/${feed.propertyId}`}
            className="vault-feed-title"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            {feed.propertyName}
          </Link>
        ) : (
          <h2 className="vault-feed-title">{feed.propertyName}</h2>
        )}
        {feed.propertyAddress && (
          <p className="vault-feed-subtitle">{feed.propertyAddress}</p>
        )}
        <p style={{ ...meta, marginTop: 6 }}>
          {feed.entries.length} vault{" "}
          {feed.entries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <ol className="vault-timeline">
        {feed.entries.map((entry) => (
          <li key={entry.id} className="vault-timeline-item">
            <VaultTimelineEntry entry={entry} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function VaultTimelineEntry({ entry }: { entry: VaultEntry }) {
  const dateLabel = formatVaultDate(entry.occurredAt);

  if (entry.type === "issue") {
    return (
      <div className="vault-timeline-card" style={card}>
        <div className="vault-entry-header">
          <span className="vault-entry-type">Issue</span>
          <time style={meta} dateTime={entry.occurredAt}>
            {dateLabel}
          </time>
        </div>
        <Link
          href={`/my-home/issues/${entry.issueId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 10,
            }}
          >
            <span style={listCardTitle}>{entry.title}</span>
            <IssueStatusBadge status={entry.status} />
          </div>
          <p style={{ ...listCardBody, marginTop: 8 }}>{entry.description}</p>
        </Link>
        {entry.imageCount > 0 && (
          <p style={{ ...meta, marginTop: 10 }}>
            {entry.imageCount} attached{" "}
            {entry.imageCount === 1 ? "image" : "images"}
          </p>
        )}
      </div>
    );
  }

  const issueLink = entry.issueId ? (
    <Link
      href={`/my-home/issues/${entry.issueId}`}
      style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}
    >
      View issue →
    </Link>
  ) : null;

  return (
    <div className="vault-timeline-card" style={card}>
      <div className="vault-entry-header">
        <span className="vault-entry-type vault-entry-type--image">Image</span>
        <time style={meta} dateTime={entry.occurredAt}>
          {dateLabel}
        </time>
      </div>
      <p style={{ ...meta, margin: "10px 0 12px" }}>{entry.caption}</p>
      <img
        src={entry.imageUrl}
        alt=""
        className="vault-timeline-thumb"
      />
      {issueLink && <div style={{ marginTop: 10 }}>{issueLink}</div>}
    </div>
  );
}
