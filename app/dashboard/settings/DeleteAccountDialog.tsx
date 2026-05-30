"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { requestAccountDeletion } from "@/lib/account/requestAccountDeletion";
import { clearAuthSession } from "@/lib/authSession";
import {
  ROUTE_ACCOUNT_DELETION,
  ROUTE_DASHBOARD_EVIDENCE_PACKAGE,
  ROUTE_HOME,
} from "@/lib/appNavigation";

type DeleteAccountDialogProps = {
  email: string | null;
  open: boolean;
  onClose: () => void;
};

export function DeleteAccountDialog({
  email,
  open,
  onClose,
}: DeleteAccountDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirmation("");
      setError(null);
      setSubmitting(false);
      return;
    }

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await requestAccountDeletion(password, confirmation);
      if (!result.ok) {
        setError(result.message);
        setSubmitting(false);
        return;
      }

      await clearAuthSession();
      window.location.href = ROUTE_HOME;
    } catch {
      setError("Could not delete your account. Try again.");
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="settings-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (submitting) {
          return;
        }
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={handleSubmit}
      >
        <h2 id={titleId} className="settings-modal-title">
          Delete account
        </h2>
        <p id={descriptionId} className="settings-modal-copy">
          This permanently removes your account, all properties, records, images,
          and documents from Vireon. This action cannot be undone.
        </p>

        <div className="settings-modal-field">
          <label htmlFor="settings-delete-email">Account email</label>
          <input
            id="settings-delete-email"
            type="email"
            value={email ?? ""}
            readOnly
            disabled
          />
        </div>

        <div className="settings-modal-field">
          <label htmlFor="settings-delete-password">Confirm password</label>
          <input
            id="settings-delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="settings-modal-field">
          <label htmlFor="settings-delete-confirm">Type DELETE to confirm</label>
          <input
            id="settings-delete-confirm"
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={submitting}
            required
            autoComplete="off"
          />
        </div>

        {error ? (
          <p
            className="settings-form-message settings-form-message--error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="settings-modal-copy">
          Need your records first?{" "}
          <Link href={ROUTE_DASHBOARD_EVIDENCE_PACKAGE}>
            Download Evidence Package
          </Link>{" "}
          or review the{" "}
          <Link href={ROUTE_ACCOUNT_DELETION}>Account Deletion Policy</Link>.
        </p>

        <div className="settings-modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="settings-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="settings-btn-danger"
            disabled={submitting}
          >
            {submitting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </div>
  );
}
