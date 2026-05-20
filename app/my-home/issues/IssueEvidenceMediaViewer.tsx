"use client";

import { useEffect } from "react";
import type { GalleryMedia } from "@/lib/gallery";

type IssueEvidenceMediaViewerProps = {
  media: GalleryMedia | null;
  onClose: () => void;
};

export function IssueEvidenceMediaViewer({
  media,
  onClose,
}: IssueEvidenceMediaViewerProps) {
  useEffect(() => {
    if (!media) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  return (
    <div
      className="my-home-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="my-home-modal my-home-issue-evidence-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${media.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="my-home-issue-evidence-preview-modal__header">
          <div>
            <p className="my-home-gallery-item-name" style={{ margin: 0 }}>
              {media.name}
            </p>
            <p className="my-home-text-muted" style={{ margin: "4px 0 0" }}>
              {media.type === "video" ? "Video" : "Photo"} ·{" "}
              {new Date(media.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="my-home-btn-ghost"
            style={{ width: "auto", padding: "6px 12px" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {media.type === "video" ? (
          <video
            className="my-home-issue-evidence-preview-modal__media"
            src={media.dataUrl}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            className="my-home-issue-evidence-preview-modal__media"
            src={media.dataUrl}
            alt={media.name}
          />
        )}
      </div>
    </div>
  );
}
