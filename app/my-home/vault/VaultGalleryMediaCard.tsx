"use client";

import { formatVaultDate } from "@/lib/evidence/vault";
import { VaultEvidenceRelationshipInline } from "./VaultEvidenceRelationshipInline";
import { VaultEntryLinks } from "./VaultEntryLinks";
import { meta } from "../ui";
import type { VaultEntry, VaultImageEntry } from "@/lib/evidence/vault";

type VaultGalleryMediaCardProps = {
  entry: VaultImageEntry;
  propertyEntries: VaultEntry[];
  showCrossLinks?: boolean;
  compact?: boolean;
};

export function VaultGalleryMediaCard({
  entry,
  propertyEntries,
  showCrossLinks = false,
  compact = false,
}: VaultGalleryMediaCardProps) {
  const dateLabel = formatVaultDate(entry.occurredAt);
  const isVideo = entry.imageUrl.startsWith("data:video/");

  return (
    <article
      className={`vault-gallery-media-card${compact ? " vault-gallery-media-card--compact" : ""}`}
    >
      <div className="vault-entry-header">
        <span className="vault-entry-type vault-entry-type--image">
          {isVideo ? "Video" : "Media"}
        </span>
        <time className="my-home-text-muted" dateTime={entry.occurredAt}>
          {dateLabel}
        </time>
      </div>
      <p style={{ ...meta, margin: compact ? "6px 0 8px" : "10px 0 12px" }}>
        {entry.caption}
      </p>
      <VaultEvidenceRelationshipInline entry={entry} />
      {isVideo ? (
        <video
          src={entry.imageUrl}
          className="vault-timeline-thumb vault-gallery-media-card__thumb"
          controls
          preload="metadata"
        />
      ) : (
        <img
          src={entry.imageUrl}
          alt=""
          className="vault-timeline-thumb vault-gallery-media-card__thumb"
        />
      )}
      {showCrossLinks ? (
        <VaultEntryLinks entry={entry} propertyEntries={propertyEntries} />
      ) : null}
    </article>
  );
}
