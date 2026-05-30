"use client";

import { useState } from "react";
import { changePassword } from "@/lib/account/changePassword";
import { PASSWORD_MIN_LENGTH } from "@/lib/authValidation";

type ChangePasswordFormProps = {
  disabled: boolean;
};

const EMPTY_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordForm({ disabled }: ChangePasswordFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleExpand = () => {
    setExpanded(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setExpanded(false);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await changePassword(
        form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setForm(EMPTY_FORM);
      setSuccess("Your password has been updated.");
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <div className="settings-password-collapsed">
        <p className="settings-field-hint">
          Update the password you use to sign in to Vireon.
        </p>

        {success ? (
          <p
            className="settings-form-message settings-form-message--success"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <div className="settings-form-actions">
          <button
            type="button"
            className="settings-link-btn"
            onClick={handleExpand}
            disabled={disabled}
          >
            Change password
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <p className="settings-field-hint">
        Use at least {PASSWORD_MIN_LENGTH} characters. You will stay signed in
        after updating your password.
      </p>

      <div className="settings-form-field">
        <label htmlFor="settings-current-password">Current password</label>
        <input
          id="settings-current-password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              currentPassword: event.target.value,
            }))
          }
          disabled={disabled || submitting}
          required
        />
      </div>

      <div className="settings-form-field">
        <label htmlFor="settings-new-password">New password</label>
        <input
          id="settings-new-password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              newPassword: event.target.value,
            }))
          }
          disabled={disabled || submitting}
          required
          minLength={PASSWORD_MIN_LENGTH}
        />
      </div>

      <div className="settings-form-field">
        <label htmlFor="settings-confirm-password">Confirm new password</label>
        <input
          id="settings-confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          disabled={disabled || submitting}
          required
          minLength={PASSWORD_MIN_LENGTH}
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

      <div className="settings-form-actions">
        <button
          type="button"
          className="settings-btn-secondary"
          onClick={handleCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="settings-btn-primary"
          disabled={disabled || submitting}
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
