"use client";

import { useEffect, useId, useRef } from "react";
import type { PropertyDataSummary } from "@/lib/account/gatherUserDataSummary";

type DeletePropertyDialogProps = {
  property: PropertyDataSummary | null;
  open: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePropertyDialog({
  property,
  open,
  deleting,
  error,
  onClose,
  onConfirm,
}: DeletePropertyDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, onClose]);

  if (!open || !property) {
    return null;
  }

  return (
    <div
      className="settings-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (deleting) {
          return;
        }
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="settings-modal-title">
          Delete property
        </h2>
        <p id={descriptionId} className="settings-modal-copy">
          Permanently delete{" "}
          <strong>{property.name}</strong> and all associated maintenance logs,
          communications, notes, snapshots, gallery images, and My Home
          documents for your account. This cannot be undone.
        </p>

        <p className="settings-modal-copy">
          Only data stored under your Vireon account for this property will be
          removed. Other users with their own records for the same address are
          not affected.
        </p>

        {error ? (
          <p
            className="settings-form-message settings-form-message--error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="settings-modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="settings-btn-secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-btn-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete property"}
          </button>
        </div>
      </div>
    </div>
  );
}
