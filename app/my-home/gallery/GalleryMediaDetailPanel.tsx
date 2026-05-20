"use client";

import { useState } from "react";
import {
  assignMediaToFolder,
  canAssignFolderEvidence,
  isGalleryMediaEvidenceOverridden,
  readGalleryFolderEvidenceLink,
  readGalleryMediaEffectiveEvidenceLink,
  readGalleryMediaEvidenceLink,
  type Folder,
  type GalleryMedia,
} from "@/lib/gallery";
import {
  formatEvidenceTargetLabel,
  hasEvidenceRelationship,
} from "@/lib/evidence";
import type { Property } from "@/lib/propertiesStore";

type GalleryMediaDetailPanelProps = {
  selectedFolder: Folder | null;
  media: GalleryMedia | null;
  property: Property | undefined;
  propertyId: string;
  folders: Folder[];
  onAssignFolderEvidence: () => void;
  onAssignMediaEvidence: () => void;
  onMediaMoved: () => void;
};

export function GalleryMediaDetailPanel({
  selectedFolder,
  media,
  property,
  propertyId,
  folders,
  onAssignFolderEvidence,
  onAssignMediaEvidence,
  onMediaMoved,
}: GalleryMediaDetailPanelProps) {
  const [moveError, setMoveError] = useState<string | null>(null);

  const folderRelationship = selectedFolder
    ? readGalleryFolderEvidenceLink(selectedFolder)
    : null;
  const folderHasEvidence = hasEvidenceRelationship(folderRelationship);
  const folderEvidenceEligible = selectedFolder
    ? canAssignFolderEvidence(selectedFolder)
    : false;
  const effectiveRelationship = media
    ? readGalleryMediaEffectiveEvidenceLink(media)
    : null;
  const mediaRelationship = media
    ? readGalleryMediaEvidenceLink(media)
    : null;
  const folderOverrides = media
    ? isGalleryMediaEvidenceOverridden(media)
    : false;

  return (
    <aside className="my-home-gallery-panel my-home-gallery-panel--detail">
      <h2 className="my-home-gallery-panel-title">Details</h2>

      {!propertyId ? (
        <p className="my-home-text-muted my-home-gallery-panel-hint">
          Select a property in Upload to manage folders and evidence.
        </p>
      ) : (
        <>
          <section className="my-home-gallery-detail-evidence">
            {folderHasEvidence && selectedFolder ? (
              <div
                className="my-home-gallery-folder-evidence-banner"
                role="status"
              >
                <strong>Folder is assigned as Evidence</strong>
                <p className="my-home-gallery-folder-evidence-banner__detail">
                  {formatEvidenceTargetLabel(folderRelationship!)} · applies
                  to all media in &ldquo;{selectedFolder.name}&rdquo;
                </p>
              </div>
            ) : null}

            <h3 className="my-home-label">Folder evidence</h3>
            <p className="my-home-text-muted my-home-gallery-detail-actions__hint">
              {!folderEvidenceEligible && selectedFolder
                ? "The default Unsorted folder cannot be assigned as evidence. Select a user folder or assign per-file evidence below."
                : folderHasEvidence
                  ? "Folder assignment takes priority over individual files."
                  : "Assign the selected folder so every item inside inherits the link."}
            </p>
            <button
              type="button"
              className="my-home-btn-primary"
              disabled={!selectedFolder || !folderEvidenceEligible}
              onClick={onAssignFolderEvidence}
            >
              {folderHasEvidence
                ? "Edit folder evidence"
                : "Assign folder as Evidence"}
            </button>
          </section>

          {!media ? (
            <p className="my-home-text-muted my-home-gallery-panel-hint">
              Select media from the grid to view file details or assign
              per-file evidence.
            </p>
          ) : (
            <>
              <section className="my-home-gallery-detail-preview">
                {media.type === "video" ? (
                  <video
                    className="my-home-gallery-detail-preview__media"
                    src={media.dataUrl}
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img
                    className="my-home-gallery-detail-preview__media"
                    src={media.dataUrl}
                    alt={media.name}
                  />
                )}
              </section>

              <dl className="my-home-gallery-detail-meta">
                <div>
                  <dt>Name</dt>
                  <dd>{media.name}</dd>
                </div>
                <div>
                  <dt>Property</dt>
                  <dd>{property ? property.name : "Unassigned"}</dd>
                </div>
                <div>
                  <dt>Uploaded</dt>
                  <dd>{new Date(media.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{media.type === "video" ? "Video" : "Image"}</dd>
                </div>
                <div>
                  <dt>Folder</dt>
                  <dd>
                    {folders.find((f) => f.id === media.folderId)?.name ??
                      "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt>Effective evidence</dt>
                  <dd>
                    {effectiveRelationship ? (
                      <>
                        {formatEvidenceTargetLabel(effectiveRelationship)}
                        {folderOverrides ? (
                          <span
                            className="my-home-text-muted"
                            style={{ display: "block", marginTop: 4 }}
                          >
                            From folder assignment
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="my-home-text-muted">Not linked</span>
                    )}
                  </dd>
                </div>
                {mediaRelationship && folderOverrides ? (
                  <div>
                    <dt>File link (stored)</dt>
                    <dd className="my-home-text-muted">
                      {formatEvidenceTargetLabel(mediaRelationship)} — not used
                      while folder evidence is set
                    </dd>
                  </div>
                ) : null}
              </dl>

              <section className="my-home-gallery-detail-move">
                <label className="my-home-label" htmlFor="gallery-move-to-folder">
                  Move to Folder
                </label>
                <select
                  id="gallery-move-to-folder"
                  className="my-home-input"
                  value={media.folderId}
                  disabled={folders.length === 0}
                  onChange={(e) => {
                    const folderId = e.target.value;
                    setMoveError(null);
                    if (!folderId || folderId === media.folderId) return;

                    void assignMediaToFolder(media.id, folderId).then((ok) => {
                      if (!ok) {
                        setMoveError(
                          "Could not move media to that folder. Try again."
                        );
                        return;
                      }
                      onMediaMoved();
                    });
                  }}
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {moveError ? (
                  <p
                    className="my-home-form-error"
                    role="alert"
                    style={{ marginTop: 8 }}
                  >
                    {moveError}
                  </p>
                ) : null}
              </section>

              <section className="my-home-gallery-detail-actions">
                <h3 className="my-home-label">File evidence (fallback)</h3>
                <p className="my-home-text-muted my-home-gallery-detail-actions__hint">
                  {folderHasEvidence
                    ? "Folder evidence applies to this file. Clear folder evidence to use a per-file link."
                    : "Link only this file when the folder has no evidence assignment."}
                </p>
                <button
                  type="button"
                  className="my-home-btn-secondary"
                  disabled={folderHasEvidence}
                  onClick={onAssignMediaEvidence}
                >
                  {mediaRelationship
                    ? "Edit file evidence"
                    : "Assign file as Evidence"}
                </button>
              </section>
            </>
          )}
        </>
      )}
    </aside>
  );
}
