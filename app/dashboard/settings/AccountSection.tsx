"use client";

import { useEffect, useState } from "react";
import {
  fetchAccountProfile,
  resendVerificationEmail,
  type AccountProfile,
} from "@/lib/account/getAccountProfile";
import { formatExportDate } from "@/lib/export/formatExportDate";
import { ChangePasswordForm } from "./ChangePasswordForm";

type AccountSectionProps = {
  sessionLoading: boolean;
};

export function AccountSection({ sessionLoading }: AccountSectionProps) {
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null
  );
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    void (async () => {
      const result = await fetchAccountProfile();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setProfile(null);
        setProfileError(result.message);
        setProfileLoading(false);
        return;
      }

      setProfile(result.profile);
      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading]);

  const handleResendVerification = async () => {
    setVerificationMessage(null);
    setVerificationError(null);
    setResendingVerification(true);

    try {
      const result = await resendVerificationEmail();
      if (!result.ok) {
        setVerificationError(result.message);
        return;
      }

      setVerificationMessage(
        "Verification email sent. Check your inbox for the confirmation link."
      );
    } finally {
      setResendingVerification(false);
    }
  };

  const accountLoading = sessionLoading || profileLoading;
  const email = profile?.email ?? null;

  return (
    <section
      className="settings-section"
      aria-labelledby="settings-account-heading"
    >
        <h2 id="settings-account-heading" className="settings-section-title">
          Account
        </h2>

        <div className="settings-card">
          <div className="settings-field">
            <span className="settings-field-label">Email address</span>
            {accountLoading ? (
              <p className="settings-field-value">Loading…</p>
            ) : profileError ? (
              <p className="settings-form-message settings-form-message--error" role="alert">
                {profileError}
              </p>
            ) : email ? (
              <p className="settings-field-value">{email}</p>
            ) : (
              <p className="settings-field-value">No email on file</p>
            )}
            <p className="settings-field-hint">
              Your account email is used to sign in and for account-related
              communication.
            </p>
          </div>

          <div className="settings-field settings-field--inline">
            <span className="settings-field-label">Email verification</span>
            {accountLoading ? (
              <p className="settings-field-value">Loading…</p>
            ) : profile?.emailVerified ? (
              <p className="settings-status settings-status--verified">Verified</p>
            ) : (
              <>
                <p className="settings-status settings-status--pending">
                  Not verified
                </p>
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="settings-link-btn"
                    onClick={() => void handleResendVerification()}
                    disabled={resendingVerification || !email}
                  >
                    {resendingVerification
                      ? "Sending…"
                      : "Resend verification email"}
                  </button>
                </div>
                {verificationMessage ? (
                  <p
                    className="settings-form-message settings-form-message--success"
                    role="status"
                  >
                    {verificationMessage}
                  </p>
                ) : null}
                {verificationError ? (
                  <p
                    className="settings-form-message settings-form-message--error"
                    role="alert"
                  >
                    {verificationError}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="settings-field">
            <span className="settings-field-label">Member since</span>
            {accountLoading ? (
              <p className="settings-field-value">Loading…</p>
            ) : profile?.createdAt ? (
              <p className="settings-field-value">
                {formatExportDate(profile.createdAt)}
              </p>
            ) : (
              <p className="settings-field-value">Unknown</p>
            )}
          </div>

          <hr className="settings-divider" />

          <div className="settings-field">
            <span className="settings-field-label">Password</span>
            <ChangePasswordForm disabled={accountLoading || !email} />
          </div>
        </div>
    </section>
  );
}
