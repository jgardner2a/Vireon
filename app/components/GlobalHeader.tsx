"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAuthSession } from "@/lib/authSession";
import { useAuthSession } from "@/lib/useAuthSession";

/** App-wide header — sole location for auth actions (app/layout.tsx). */
export function GlobalHeader() {
  const [mounted, setMounted] = useState(false);
  const { email, isAuthenticated } = useAuthSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  return (
    <header className="vireon-global-header">
      <div className="vireon-global-header__bar">
        <nav className="vireon-global-header__nav" aria-label="Main">
          <Link href="/" className="vireon-global-header__link">
            Places
          </Link>
          <Link href="/my-home" className="vireon-global-header__link">
            My Home
          </Link>
        </nav>

        <div className="vireon-global-header__auth">
          {mounted &&
            (isAuthenticated ? (
              <>
                {email ? (
                  <span
                    className="vireon-global-header__email"
                    title={email}
                  >
                    {email}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="vireon-global-header__logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login?redirect=%2F"
                className="vireon-global-header__login"
              >
                Login / Create Account
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
