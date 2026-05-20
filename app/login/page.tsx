"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/authValidation";
import { signInUser, signUpUser } from "@/lib/authUsers";

function resolveRedirectPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignUp = searchParams.get("signup") === "1";
  const redirectParam = searchParams.get("redirect");
  const redirectTo = resolveRedirectPath(
    redirectParam ?? (isSignUp ? "/" : "/my-home")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleHref = isSignUp
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : `/login?signup=1&redirect=${encodeURIComponent(redirectTo)}`;

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

  return (
    <div
      className="vireon-route-fill"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 24,
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      >
        <h1 style={{ fontSize: 20 }}>{isSignUp ? "Create account" : "Login"}</h1>

        <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.4 }}>
          {isSignUp
            ? `Use your email and a password (${PASSWORD_MIN_LENGTH}+ characters).`
            : "Sign in with the email and password for your account."}
        </p>

        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
          required
        />

        <input
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
          minLength={PASSWORD_MIN_LENGTH}
          required
        />

        {isSignUp && (
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={input}
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        )}

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }} role="alert">
            {error}
          </p>
        )}

        <button style={button} type="submit" disabled={submitting}>
          {submitting
            ? "Please wait…"
            : isSignUp
              ? "Create account"
              : "Enter My Home"}
        </button>

        <p style={{ margin: 0, fontSize: 13, color: "#666", textAlign: "center" }}>
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href={toggleHref} style={{ color: "#111", fontWeight: 500 }}>
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Vireon?{" "}
              <Link href={toggleHref} style={{ color: "#111", fontWeight: 500 }}>
                Create account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#666",
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const button: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "white",
  cursor: "pointer",
};
