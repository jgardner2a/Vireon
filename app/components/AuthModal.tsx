"use client";

import { useEffect, useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/authValidation";
import { signInUser, signUpUser } from "@/lib/authUsers";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
};

export function AuthModal({
  open,
  onClose,
  onSuccess,
  title = "Sign in to save",
  description = "Log in or create an account to save this location to My Home.",
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = isSignUp
        ? await signUpUser(email, password, confirmPassword)
        : await signInUser(email, password);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="vireon-auth-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="vireon-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="vireon-auth-modal__form">
          <h2 id="auth-modal-title" className="vireon-auth-modal__title">
            {isSignUp ? "Create account" : title}
          </h2>
          <p className="vireon-auth-modal__description">
            {isSignUp
              ? `Use your email and a password (${PASSWORD_MIN_LENGTH}+ characters).`
              : description}
          </p>

          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="vireon-auth-modal__input"
            required
          />

          <input
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="vireon-auth-modal__input"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />

          {isSignUp ? (
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="vireon-auth-modal__input"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
          ) : null}

          {error ? (
            <p className="vireon-auth-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="vireon-auth-modal__submit"
            disabled={submitting}
          >
            {submitting
              ? "Please wait…"
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>

          <p className="vireon-auth-modal__toggle">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="vireon-auth-modal__link"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New to Vireon?{" "}
                <button
                  type="button"
                  className="vireon-auth-modal__link"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                >
                  Create account
                </button>
              </>
            )}
          </p>

          <button
            type="button"
            className="vireon-auth-modal__cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
