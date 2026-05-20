"use client";

import { useEffect, useMemo, useState } from "react";
import type { GalleryEvidenceLink } from "@/lib/galleryEvidenceLink";
import {
  hasEvidenceRelationship,
  isForbiddenEvidenceTargetType,
  normalizeEvidenceTargetType,
  projectFolderEvidenceLink,
  projectMediaEvidenceLink,
} from "@/lib/evidence";
import {
  assignGalleryFolderEvidence,
  assignGalleryMediaEvidence,
  buildGalleryEvidenceTargets,
  canAssignFolderEvidence,
  clearGalleryFolderEvidence,
  clearGalleryMediaEvidence,
  galleryEvidenceTargetKey,
  type Folder,
  type GalleryMedia,
} from "@/lib/gallery";
import { galleryMediaDisplaySrc } from "./galleryMediaDisplaySrc";

export type MarkEvidenceModalTarget =
  | { mode: "folder"; folder: Folder }
  | { mode: "media"; media: GalleryMedia };

type MarkEvidenceModalProps = {
  target: MarkEvidenceModalTarget | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function parseTargetKey(key: string): GalleryEvidenceLink | null {
  const [type, ...rest] = key.split(":");
  const id = rest.join(":");
  if (isForbiddenEvidenceTargetType(type)) {
    return null;
  }
  const normalizedType = normalizeEvidenceTargetType(type);
  if (!normalizedType || !id.trim()) {
    return null;
  }
  return { type: normalizedType, id: id.trim() };
}

export function MarkEvidenceModal({
  target,
  open,
  onClose,
  onSaved,
}: MarkEvidenceModalProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const propertyId =
    target?.mode === "folder"
      ? target.folder.propertyId
      : target?.mode === "media"
        ? target.media.propertyId
        : null;

  const targets = useMemo(
    () =>
      propertyId != null ? buildGalleryEvidenceTargets(propertyId) : [],
    [propertyId]
  );

  const existingRelationship =
    target?.mode === "folder"
      ? projectFolderEvidenceLink(target.folder)
      : target?.mode === "media"
        ? projectMediaEvidenceLink(target.media)
        : null;

  useEffect(() => {
    if (!open || !target) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, target, onClose]);

  useEffect(() => {
    if (!open || !target) return;

    setError(null);
    setSubmitting(false);

    if (hasEvidenceRelationship(existingRelationship)) {
      const existing = galleryEvidenceTargetKey(
        existingRelationship.targetType,
        existingRelationship.targetId
      );
      setSelectedKey(targets.some((t) => t.key === existing) ? existing : null);
      return;
    }

    setSelectedKey(targets.length === 1 ? targets[0].key : null);
  }, [open, target, targets, existingRelationship]);

  if (!open || !target) return null;

  const folderTargetBlocked =
    target.mode === "folder" && !canAssignFolderEvidence(target.folder);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedKey) {
      setError(
        "Select an issue, incident, maintenance request, or lease record to link."
      );
      return;
    }

    const targetLink = parseTargetKey(selectedKey);
    if (!targetLink) {
      setError("Invalid selection.");
      return;
    }

    if (target.mode === "folder" && !canAssignFolderEvidence(target.folder)) {
      setError("System folders cannot be assigned as evidence.");
      return;
    }

    setSubmitting(true);
    const ok = await (target.mode === "folder"
      ? assignGalleryFolderEvidence(target.folder.id, targetLink)
      : assignGalleryMediaEvidence(target.media.id, targetLink));
    setSubmitting(false);

    if (!ok) {
      setError(
        target.mode === "folder"
          ? "Could not save folder evidence link. System folders cannot be assigned."
          : "Could not save evidence link. Try again."
      );
      return;
    }

    onSaved();
    onClose();
  };

  const handleClear = async () => {
    setSubmitting(true);
    const ok = await (target.mode === "folder"
      ? clearGalleryFolderEvidence(target.folder.id)
      : clearGalleryMediaEvidence(target.media.id));
    setSubmitting(false);

    if (!ok) {
      setError("Could not clear evidence link.");
      return;
    }

    onSaved();
    onClose();
  };

  const issueTargets = targets.filter((t) => t.type === "issue");
  const leaseTargets = targets.filter((t) => t.type === "lease");
  const incidentTargets = targets.filter((t) => t.type === "incident");

  const renderGroup = (
    heading: string,
    items: typeof targets,
    name: string
  ) => {
    if (items.length === 0) return null;

    return (
      <fieldset className="my-home-evidence-target-group">
        <legend className="my-home-label">{heading}</legend>
        <ul className="my-home-evidence-target-list">
          {items.map((item) => (
            <li key={item.key}>
              <label className="my-home-evidence-target-option">
                <input
                  type="radio"
                  name={name}
                  value={item.key}
                  checked={selectedKey === item.key}
                  onChange={() => setSelectedKey(item.key)}
                  disabled={submitting}
                />
                <span className="my-home-evidence-target-option__body">
                  <span className="my-home-evidence-target-option__label">
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="my-home-text-muted">{item.detail}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    );
  };

  const saveDisabled =
    submitting ||
    folderTargetBlocked ||
    targets.length === 0 ||
    !selectedKey;
  const isFolder = target.mode === "folder";

  if (folderTargetBlocked) {
    return (
      <section
        className="my-home-modal-backdrop"
        role="presentation"
        onClick={onClose}
      >
        <section
          className="my-home-modal my-home-evidence-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mark-evidence-blocked-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="mark-evidence-blocked-title" className="my-home-card-title">
            Folder not eligible
          </h2>
          <p className="my-home-text-muted" style={{ marginTop: 12 }}>
            The default Unsorted folder cannot be assigned as evidence. Select a
            user-created folder in the sidebar, or assign evidence to individual
            files.
          </p>
          <button
            type="button"
            className="my-home-btn-primary"
            style={{ width: "auto", marginTop: 24 }}
            onClick={onClose}
          >
            Close
          </button>
        </section>
      </section>
    );
  }

  return (
    <section
      className="my-home-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="my-home-modal my-home-evidence-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-evidence-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleConfirm}>
          <h2 id="mark-evidence-title" className="my-home-card-title">
            {isFolder ? "Assign folder as evidence" : "Assign file as evidence"}
          </h2>
          <p className="my-home-text-muted" style={{ marginTop: 8 }}>
            {isFolder
              ? "All media in this folder will inherit the link. Only metadata is updated."
              : "Link this file to an existing record. Used when the folder has no evidence assignment."}
          </p>

          <section className="my-home-evidence-preview">
            {isFolder ? (
              <section className="my-home-evidence-preview__meta">
                <p className="my-home-gallery-item-name">{target.folder.name}</p>
                <p className="my-home-text-muted">
                  Folder · {target.folder.mediaIds.length} item
                  {target.folder.mediaIds.length === 1 ? "" : "s"}
                </p>
              </section>
            ) : target.media.type === "video" ? (
              <video
                className="my-home-evidence-preview__media"
                src={target.media.dataUrl}
                controls
                preload="metadata"
              />
            ) : (
              <img
                className="my-home-evidence-preview__media"
                src={galleryMediaDisplaySrc(target.media)}
                alt={target.media.name}
              />
            )}
            {!isFolder ? (
              <section className="my-home-evidence-preview__meta">
                <p className="my-home-gallery-item-name">{target.media.name}</p>
                <p className="my-home-text-muted">
                  {target.media.type === "video" ? "Video" : "Image"} ·{" "}
                  {new Date(target.media.createdAt).toLocaleString()}
                </p>
              </section>
            ) : null}
          </section>

          {targets.length === 0 ? (
            <p className="my-home-text-muted" style={{ marginTop: 20 }}>
              No issues, incidents, maintenance requests, or lease records exist
              for this property yet. Add them in My Home first, then return here
              to link evidence.
            </p>
          ) : (
            <section
              className="my-home-evidence-targets"
              style={{ marginTop: 20 }}
            >
              {renderGroup("Issues", issueTargets, "evidence-target")}
              {renderGroup("Lease", leaseTargets, "evidence-target")}
              {renderGroup("Incident log", incidentTargets, "evidence-target")}
            </section>
          )}

          {error ? (
            <p className="my-home-form-error" role="alert" style={{ marginTop: 16 }}>
              {error}
            </p>
          ) : null}

          <section
            className="my-home-row-between"
            style={{ marginTop: 24, gap: 12, flexWrap: "wrap" }}
          >
            {hasEvidenceRelationship(existingRelationship) ? (
              <button
                type="button"
                className="my-home-btn-ghost"
                style={{ width: "auto" }}
                disabled={submitting}
                onClick={handleClear}
              >
                Clear link
              </button>
            ) : (
              <span />
            )}
            <section style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="my-home-btn-secondary"
                style={{ width: "auto" }}
                disabled={submitting}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="my-home-btn-primary"
                style={{ width: "auto" }}
                disabled={saveDisabled}
              >
                {submitting ? "Saving…" : "Confirm assignment"}
              </button>
            </section>
          </section>
        </form>
      </section>
    </section>
  );
}
