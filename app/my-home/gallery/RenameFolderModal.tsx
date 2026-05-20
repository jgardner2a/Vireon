"use client";

import { useEffect, useState } from "react";
import {
  UNSORTED_FOLDER_NAME,
  updateFolderName,
  type Folder,
} from "@/lib/gallery";

type RenameFolderModalProps = {
  open: boolean;
  folder: Folder | null;
  propertyName: string;
  onClose: () => void;
  onRenamed: (folder: Folder) => void;
};

export function RenameFolderModal({
  open,
  folder,
  propertyName,
  onClose,
  onRenamed,
}: RenameFolderModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !folder) return;
    setName(folder.name);
    setError(null);
    setSubmitting(false);
  }, [open, folder]);

  if (!open) return null;
  if (!folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a folder name.");
      return;
    }

    if (trimmed === UNSORTED_FOLDER_NAME) {
      setError(`"${UNSORTED_FOLDER_NAME}" is reserved for the default folder.`);
      return;
    }

    if (trimmed === folder.name) {
      onClose();
      return;
    }

    setSubmitting(true);
    const result = await updateFolderName(folder.id, trimmed);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onRenamed(result.folder);
    onClose();
  };

  return (
    <section
      className="my-home-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="my-home-modal my-home-gallery-folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <h2 id="rename-folder-title" className="my-home-card-title">
            Rename folder
          </h2>
          <p className="my-home-text-muted" style={{ marginTop: 8 }}>
            Update the name for this folder under{" "}
            <strong>{propertyName}</strong>.
          </p>

          <section className="my-home-field" style={{ marginTop: 20 }}>
            <label className="my-home-label" htmlFor="rename-folder-name">
              Folder name
            </label>
            <input
              id="rename-folder-name"
              type="text"
              className="my-home-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kitchen renovation"
              disabled={submitting}
              autoFocus
              maxLength={80}
            />
          </section>

          {error ? (
            <p className="my-home-form-error" role="alert" style={{ marginTop: 16 }}>
              {error}
            </p>
          ) : null}

          <section
            className="my-home-row-between"
            style={{ marginTop: 24, gap: 12, flexWrap: "wrap" }}
          >
            <span />
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
                disabled={submitting || !name.trim()}
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </section>
          </section>
        </form>
      </section>
    </section>
  );
}
