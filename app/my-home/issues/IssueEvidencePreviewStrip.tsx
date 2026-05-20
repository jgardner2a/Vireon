"use client";

import { useMemo, useState } from "react";
import { buildIssueEvidencePreview } from "@/lib/evidence";
import type { GalleryMedia } from "@/lib/gallery";
import { IssueEvidenceAttachmentCount } from "./IssueEvidenceAttachmentCount";
import { IssueEvidenceMediaViewer } from "./IssueEvidenceMediaViewer";

type IssueEvidencePreviewStripProps = {
  issueId: number | string;
  propertyId?: number | string;
  /** Hide strip entirely when no evidence (default). */
  hideWhenEmpty?: boolean;
  showAttachmentLabel?: boolean;
  compact?: boolean;
};

function PreviewThumb({
  media,
  onOpen,
}: {
  media: GalleryMedia;
  onOpen: (media: GalleryMedia) => void;
}) {
  return (
    <button
      type="button"
      className="my-home-issue-evidence-card-thumb"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(media);
      }}
      aria-label={`Preview evidence: ${media.name}`}
    >
      {media.type === "video" ? (
        <video
          className="my-home-issue-evidence-card-thumb__media"
          src={media.dataUrl}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          className="my-home-issue-evidence-card-thumb__media"
          src={media.dataUrl}
          alt=""
        />
      )}
      {media.type === "video" ? (
        <span className="my-home-issue-evidence-card-thumb__badge" aria-hidden>
          ▶
        </span>
      ) : null}
    </button>
  );
}

export function IssueEvidencePreviewStrip({
  issueId,
  propertyId,
  hideWhenEmpty = true,
  showAttachmentLabel = true,
  compact = true,
}: IssueEvidencePreviewStripProps) {
  const [preview, setPreview] = useState<GalleryMedia | null>(null);

  const previewModel = useMemo(
    () =>
      buildIssueEvidencePreview(issueId, {
        propertyId,
      }),
    [issueId, propertyId]
  );

  if (!previewModel.hasEvidence) {
    if (hideWhenEmpty) return null;
    return (
      <p className="my-home-issue-evidence-card-empty my-home-text-muted">
        No evidence attached
      </p>
    );
  }

  const { previewThumbnails, overflowCount, counts } = previewModel;
  const hasThumbnails = previewThumbnails.length > 0;

  return (
    <>
      <div
        className={
          compact
            ? "my-home-issue-evidence-card-preview"
            : "my-home-issue-evidence-card-preview my-home-issue-evidence-card-preview--spacious"
        }
      >
        {showAttachmentLabel ? (
          <IssueEvidenceAttachmentCount counts={counts} />
        ) : null}

        {hasThumbnails ? (
          <div className="my-home-issue-evidence-card-preview__thumbs">
            {previewThumbnails.map((media) => (
              <PreviewThumb
                key={media.id}
                media={media}
                onOpen={setPreview}
              />
            ))}
            {overflowCount > 0 ? (
              <span
                className="my-home-issue-evidence-card-preview__more"
                aria-label={`${overflowCount} more attachments`}
              >
                +{overflowCount}
              </span>
            ) : null}
          </div>
        ) : counts.documentCount > 0 ? (
          <span className="my-home-issue-evidence-card-preview__docs-only">
            {counts.documentCount} document
            {counts.documentCount === 1 ? "" : "s"} linked
          </span>
        ) : null}
      </div>

      <IssueEvidenceMediaViewer media={preview} onClose={() => setPreview(null)} />
    </>
  );
}
