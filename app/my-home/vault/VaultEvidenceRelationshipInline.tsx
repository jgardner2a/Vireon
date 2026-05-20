"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { formatEvidenceTargetType } from "@/lib/evidence";
import {
  vaultImageEvidenceRelationship,
  vaultImageHasEvidenceRelationship,
  type VaultImageEntry,
} from "@/lib/evidence/vault";

type VaultEvidenceRelationshipInlineProps = {
  entry: VaultImageEntry;
  className?: string;
  showLabel?: boolean;
  emptyClassName?: string;
  /** When set, render this instead of the default empty message (use `null` to hide). */
  ifEmpty?: ReactNode;
};

/** Renders vault image entry target from centralized evidence relationship. */
export function VaultEvidenceRelationshipInline({
  entry,
  className = "vault-relationships__edge-inline vault-gallery-media-card__link",
  showLabel = true,
  emptyClassName = "my-home-text-muted vault-gallery-media-card__link",
  ifEmpty,
}: VaultEvidenceRelationshipInlineProps) {
  const link = vaultImageEvidenceRelationship(entry);

  if (!vaultImageHasEvidenceRelationship(entry) || !link) {
    if (ifEmpty !== undefined) {
      return ifEmpty;
    }
    return (
      <p className={emptyClassName}>No evidence link on this file</p>
    );
  }

  return (
    <p className={className}>
      {showLabel ? (
        <>
          <span className="vault-gallery-media-card__link-label">Linked to</span>{" "}
        </>
      ) : null}
      {formatEvidenceTargetType(link.targetType)}
      {link.targetType === "issue" && entry.issueId ? (
        <>
          {": "}
          <Link href={`/my-home/issues/${entry.issueId}`}>
            {entry.issueTitle ?? `Issue #${link.targetId}`}
          </Link>
        </>
      ) : null}
      {link.targetType === "lease" && entry.propertyId ? (
        <>
          {": "}
          <Link
            href={`/my-home/properties/${entry.propertyId}#lease-${link.targetId}`}
          >
            Lease record
          </Link>
        </>
      ) : null}
      {link.targetType === "incident" ? (
        <>: incident #{link.targetId}</>
      ) : null}
    </p>
  );
}
