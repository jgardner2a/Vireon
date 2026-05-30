"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  DEFAULT_SIGN_IN_REDIRECT,
  DEFAULT_SIGN_UP_REDIRECT,
  resolveSafeRedirectPath,
  ROUTE_HOME,
  ROUTE_PRIVACY,
  ROUTE_TERMS,
} from "@/lib/appNavigation";
import { PASSWORD_MIN_LENGTH } from "@/lib/authValidation";
import { signInUser, signUpUser } from "@/lib/authUsers";
import { useAuthSession } from "@/lib/useAuthSession";
import "./login.css";

const SIGN_IN_HIGHLIGHTS = [
  "Pick up logs, photos, and notes where you left off",
  "Jump straight to your property workspace",
  "Export an Evidence Package when you need it",
] as const;

const SIGN_UP_STEPS = [
  {
    title: "Create your account",
    text: "Use your email and a secure password—no credit card.",
  },
  {
    title: "Add your property",
    text: "Set up the home you live in and start organizing records.",
  },
  {
    title: "Log as life happens",
    text: "Maintenance, communications, and photos in one place.",
  },
] as const;

function AuthContextPanel({ isSignUp }: { isSignUp: boolean }) {
  if (isSignUp) {
    return (
      <aside
        className="vireon-auth-panel vireon-auth-panel--signup"
        aria-labelledby="auth-panel-heading"
      >
        <span className="vireon-auth-panel__mark" aria-hidden>
          V
        </span>
        <p className="vireon-auth-panel__eyebrow">Get started</p>
        <h2 id="auth-panel-heading" className="vireon-auth-panel__title">
          Your home record starts here
        </h2>
        <p className="vireon-auth-panel__lead">
          Free to start. One property, core evidence logs, and a photo gallery—
          upgrade only when you need more.
        </p>
        <ol className="vireon-auth-panel__steps">
          {SIGN_UP_STEPS.map((step, index) => (
            <li key={step.title} className="vireon-auth-panel__step">
              <span className="vireon-auth-panel__step-num" aria-hidden>
                {index + 1}
              </span>
              <div className="vireon-auth-panel__step-body">
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    );
  }

  return (
    <aside
      className="vireon-auth-panel vireon-auth-panel--signin"
      aria-labelledby="auth-panel-heading"
    >
      <span className="vireon-auth-panel__mark" aria-hidden>
        V
      </span>
      <p className="vireon-auth-panel__eyebrow">Welcome back</p>
      <h2 id="auth-panel-heading" className="vireon-auth-panel__title">
        Continue your home record
      </h2>
      <p className="vireon-auth-panel__lead">
        Sign in to open your dashboard and keep building a clear timeline of
        your property.
      </p>
      <ul className="vireon-auth-panel__list">
        {SIGN_IN_HIGHLIGHTS.map((line) => (
          <li key={line}>
            <span className="vireon-auth-panel__list-icon" aria-hidden>
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();

  const isSignUp = searchParams.get("signup") === "1";
  const redirectParam = searchParams.get("redirect");
  const redirectTo = resolveSafeRedirectPath(
    redirectParam,
    isSignUp ? DEFAULT_SIGN_UP_REDIRECT : DEFAULT_SIGN_IN_REDIRECT
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAuthenticated, redirectTo, router]);

  const signInHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  const signUpHref = `/login?signup=1&redirect=${encodeURIComponent(redirectTo)}`;
  const toggleHref = isSignUp ? signInHref : signUpHref;

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

      router.push(redirectTo);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="vireon-auth">
        <div className="vireon-auth-loading" role="status">
          <span className="vireon-auth-loading__spinner" aria-hidden />
          Loading your session…
        </div>
      </div>
    );
  }

  return (
    <div className="vireon-auth">
      <div className="vireon-auth__layout">
        <AuthContextPanel isSignUp={isSignUp} />

        <div className="vireon-auth-form-wrap">
          <div className="vireon-auth-card">
            <nav className="vireon-auth-tabs" aria-label="Account access">
              <Link
                href={signInHref}
                className={
                  !isSignUp
                    ? "vireon-auth-tabs__tab vireon-auth-tabs__tab--active"
                    : "vireon-auth-tabs__tab"
                }
                aria-current={!isSignUp ? "page" : undefined}
              >
                Sign in
              </Link>
              <Link
                href={signUpHref}
                className={
                  isSignUp
                    ? "vireon-auth-tabs__tab vireon-auth-tabs__tab--active"
                    : "vireon-auth-tabs__tab"
                }
                aria-current={isSignUp ? "page" : undefined}
              >
                Create account
              </Link>
            </nav>

            <header className="vireon-auth-form__header">
              <h1 className="vireon-auth-form__title">
                {isSignUp ? "Set up your account" : "Sign in to Vireon"}
              </h1>
              <p className="vireon-auth-form__subtitle">
                {isSignUp
                  ? "You’ll land in your dashboard ready to add your first property."
                  : "Use the email and password tied to your Vireon account."}
              </p>
            </header>

            <form className="vireon-auth-form" onSubmit={handleSubmit}>
              <div className="vireon-auth-field">
                <label className="vireon-auth-field__label" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  className="vireon-auth-field__input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="vireon-auth-field">
                <label
                  className="vireon-auth-field__label"
                  htmlFor="auth-password"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  className="vireon-auth-field__input"
                  type="password"
                  name="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder={
                    isSignUp ? "At least 8 characters" : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                />
                {isSignUp ? (
                  <p className="vireon-auth-field__hint">
                    Must be at least {PASSWORD_MIN_LENGTH} characters.
                  </p>
                ) : null}
              </div>

              {isSignUp ? (
                <div className="vireon-auth-field">
                  <label
                    className="vireon-auth-field__label"
                    htmlFor="auth-confirm-password"
                  >
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    className="vireon-auth-field__input"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                </div>
              ) : null}

              {error ? (
                <p className="vireon-auth-alert" role="alert">
                  {error}
                </p>
              ) : null}

              {isSignUp ? (
                <p className="vireon-auth-legal">
                  By creating an account, you agree to our{" "}
                  <Link href={ROUTE_TERMS}>Terms of Service</Link> and{" "}
                  <Link href={ROUTE_PRIVACY}>Privacy Policy</Link>.
                </p>
              ) : null}

              <button
                className="vireon-auth-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Please wait…"
                  : isSignUp
                    ? "Create account & continue"
                    : "Sign in to dashboard"}
              </button>

              <p className="vireon-auth-switch">
                {isSignUp ? (
                  <>
                    Already documenting with Vireon?{" "}
                    <Link href={toggleHref}>Sign in instead</Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link href={toggleHref}>Create a free account</Link>
                  </>
                )}
              </p>
            </form>
          </div>

          <Link href={ROUTE_HOME} className="vireon-auth-back">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="vireon-auth">
          <div className="vireon-auth-loading" role="status">
            <span className="vireon-auth-loading__spinner" aria-hidden />
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
