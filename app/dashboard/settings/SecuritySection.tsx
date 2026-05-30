"use client";

import { useState } from "react";
import { clearAuthSessionEverywhere } from "@/lib/authSession";
import { ROUTE_LOGIN } from "@/lib/appNavigation";

export function SecuritySection() {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOutEverywhere = async () => {
    setError(null);
    setSigningOut(true);

    try {
      await clearAuthSessionEverywhere();
      window.location.href = ROUTE_LOGIN;
    } catch {
      setError("Could not sign out on all devices. Try again.");
      setSigningOut(false);
      setConfirming(false);
    }
  };

  return (
    <section
      className="settings-section"
      aria-labelledby="settings-security-heading"
    >
      <h2 id="settings-security-heading" className="settings-section-title">
        Security
      </h2>

      <div className="settings-card">
        <p className="settings-field-label">Sign out everywhere</p>
        <p className="settings-field-hint">
          End your Vireon session on this device and any other devices where
          you are signed in. You will need to sign in again to continue.
        </p>

        {error ? (
          <p
            className="settings-form-message settings-form-message--error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {confirming ? (
          <div className="settings-confirm-panel">
            <p className="settings-confirm-copy">
              Sign out on all devices now?
            </p>
            <div className="settings-form-actions">
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={() => setConfirming(false)}
                disabled={signingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn-primary"
                onClick={() => void handleSignOutEverywhere()}
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign out everywhere"}
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-form-actions">
            <button
              type="button"
              className="settings-link-btn"
              onClick={() => setConfirming(true)}
            >
              Sign out everywhere
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
