"use client";

import { useState } from "react";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { useAuthSession } from "@/lib/useAuthSession";

export function DeleteAccountSection() {
  const { email, isLoading } = useAuthSession();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <section
        className="settings-section settings-section--danger"
        aria-labelledby="settings-delete-account-heading"
      >
        <h2 id="settings-delete-account-heading" className="settings-section-title">
          Delete account
        </h2>

        <div className="settings-danger-zone">
          <p className="settings-danger-copy">
            Permanently remove your account and all associated data from Vireon.
            This cannot be undone.
          </p>
          <div className="settings-danger-actions">
            <button
              type="button"
              className="settings-btn-danger"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <DeleteAccountDialog
        email={email}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
