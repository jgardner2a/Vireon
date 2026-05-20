"use client";

import { useEffect, useState } from "react";
import {
  createFolder,
  UNSORTED_FOLDER_NAME,
  type Folder,
} from "@/lib/gallery";

type CreateFolderModalProps = {
  open: boolean;
  propertyId: string;
  propertyName: string;
  onClose: () => void;
  onCreated: (folder: Folder) => void;
};

export function CreateFolderModal({
  open,
  propertyId,
  propertyName,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
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
    if (!open) return;
    setName("");
    setError(null);
    setSubmitting(false);
  }, [open, propertyId]);

  if (!open) return null;

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

    setSubmitting(true);
    const result = await createFolder({ name: trimmed, propertyId });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onCreated(result.folder);
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
        aria-labelledby="create-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <h2 id="create-folder-title" className="my-home-card-title">
            Create folder
          </h2>
          <p className="my-home-text-muted" style={{ marginTop: 8 }}>
            New folder under <strong>{propertyName}</strong>.
          </p>

          <section className="my-home-field" style={{ marginTop: 20 }}>
            <label className="my-home-label" htmlFor="folder-name">
              Folder name
            </label>
            <input
              id="folder-name"
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
                {submitting ? "Creating…" : "Create"}
              </button>
            </section>
          </section>
        </form>
      </section>
    </section>
  );
}
