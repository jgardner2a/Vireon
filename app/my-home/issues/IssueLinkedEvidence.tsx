"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildIssueEvidencePreview,
  type EvidenceTargetType,
} from "@/lib/evidence";
import type { GalleryMedia } from "@/lib/gallery";
import type { Document } from "@/lib/documentsStore";
import { IssueEvidenceAttachmentCount } from "./IssueEvidenceAttachmentCount";
import { IssueEvidenceMediaViewer } from "./IssueEvidenceMediaViewer";

type IssueLinkedEvidenceProps = {
  targetType?: EvidenceTargetType;
  targetId: number | string;
  propertyId?: number | string;
};

function EvidenceMediaThumbGrid({
  items,
  onPreview,
  showTimestamps = false,
}: {
  items: GalleryMedia[];
  onPreview: (item: GalleryMedia) => void;
  showTimestamps?: boolean;
}) {
  return (
    <ul className="my-home-issue-evidence-grid">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="my-home-issue-evidence-thumb"
            onClick={() => onPreview(item)}
            aria-label={`Preview ${item.name}`}
          >
            {item.type === "video" ? (
              <video
                className="my-home-issue-evidence-thumb__media"
                src={item.dataUrl}
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                className="my-home-issue-evidence-thumb__media"
                src={item.dataUrl}
                alt=""
              />
            )}
            <span className="my-home-issue-evidence-thumb__label">
              {item.name}
            </span>
            {showTimestamps ? (
              <span className="my-home-issue-evidence-thumb__date">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function DocumentEvidenceList({
  documents,
  showTimestamps = false,
}: {
  documents: Document[];
  showTimestamps?: boolean;
}) {
  return (
    <ul className="my-home-issue-evidence-documents">
      {documents.map((doc) => (
        <li key={doc.id} className="my-home-issue-evidence-document">
          <span className="my-home-issue-evidence-document__name">
            {doc.name}
          </span>
          {doc.fileName ? (
            <span className="my-home-text-muted my-home-issue-evidence-document__file">
              {doc.fileName}
            </span>
          ) : null}
          {showTimestamps ? (
            <span className="my-home-text-muted my-home-issue-evidence-document__date">
              {new Date(doc.createdAt).toLocaleString()}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function IssueLinkedEvidence({
  targetType = "issue",
  targetId,
  propertyId,
}: IssueLinkedEvidenceProps) {
  const [preview, setPreview] = useState<GalleryMedia | null>(null);

  const previewModel = useMemo(
    () =>
      buildIssueEvidencePreview(targetId, { propertyId }),
    [targetId, propertyId]
  );

  const { resolved, counts } = previewModel;
  const hasFolders = resolved.folders.length > 0;
  const hasMedia = resolved.media.length > 0;
  const hasDocuments = resolved.documents.length > 0;
  const isEmpty = !previewModel.hasEvidence;

  return (
    <section className="my-home-card" style={{ marginBottom: 16 }}>
      <header className="my-home-issue-evidence-detail__header">
        <div>
          <h2 className="my-home-card-title">Supporting evidence</h2>
          <p
            className="my-home-text-muted"
            style={{ marginTop: 4, marginBottom: 0 }}
          >
            Proof linked via evidence relationships — not stored on this issue.{" "}
            <Link href="/my-home/gallery">Manage in Gallery</Link>.
          </p>
        </div>
        {!isEmpty ? <IssueEvidenceAttachmentCount counts={counts} /> : null}
      </header>

      {isEmpty ? (
        <p className="my-home-text-muted" style={{ marginTop: 16, marginBottom: 0 }}>
          No evidence attached yet. Link gallery media or documents from Gallery.
        </p>
      ) : (
        <div className="my-home-issue-evidence-groups" style={{ marginTop: 20 }}>
          {hasFolders ? (
            <section className="my-home-issue-evidence-group">
              <header className="my-home-issue-evidence-group__header">
                <h3 className="my-home-issue-evidence-group__title">Folders</h3>
                <span className="my-home-issue-evidence-group__badge my-home-issue-evidence-group__badge--folder">
                  Folder
                </span>
              </header>
              {resolved.folders.map(({ folder, media }) => (
                <article
                  key={folder.id}
                  className="my-home-issue-evidence-folder-block"
                >
                  <header className="my-home-issue-evidence-folder-block__head">
                    <h4 className="my-home-issue-evidence-folder-block__title">
                      {folder.name}
                    </h4>
                    <span className="my-home-text-muted">
                      {media.length} file{media.length === 1 ? "" : "s"}
                    </span>
                  </header>
                  {media.length > 0 ? (
                    <EvidenceMediaThumbGrid
                      items={media}
                      onPreview={setPreview}
                      showTimestamps
                    />
                  ) : (
                    <p className="my-home-text-muted" style={{ margin: 0 }}>
                      Folder is linked but has no media yet.
                    </p>
                  )}
                </article>
              ))}
            </section>
          ) : null}

          {hasMedia ? (
            <section className="my-home-issue-evidence-group">
              <header className="my-home-issue-evidence-group__header">
                <h3 className="my-home-issue-evidence-group__title">Media</h3>
                <span className="my-home-issue-evidence-group__badge my-home-issue-evidence-group__badge--media">
                  File
                </span>
              </header>
              <EvidenceMediaThumbGrid
                items={resolved.media.map((entry) => entry.media)}
                onPreview={setPreview}
                showTimestamps
              />
            </section>
          ) : null}

          {hasDocuments ? (
            <section className="my-home-issue-evidence-group">
              <header className="my-home-issue-evidence-group__header">
                <h3 className="my-home-issue-evidence-group__title">
                  Documents
                </h3>
                <span className="my-home-issue-evidence-group__badge my-home-issue-evidence-group__badge--document">
                  Document
                </span>
              </header>
              <DocumentEvidenceList
                documents={resolved.documents.map((e) => e.document)}
                showTimestamps
              />
            </section>
          ) : null}
        </div>
      )}

      <IssueEvidenceMediaViewer media={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
