"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession } from "@/lib/authSession";
import {
  APP_TOP_NAV_ITEMS,
  DEFAULT_SIGN_IN_REDIRECT,
  isAppNavActive,
  loginHref,
} from "@/lib/appNavigation";
import { useAuthSession } from "@/lib/useAuthSession";

/** App-wide header — sole location for auth actions (app/layout.tsx). */
export function GlobalHeader() {
  const pathname = usePathname();
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
          {APP_TOP_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isAppNavActive(pathname, item.href, item.exact)
                  ? "vireon-global-header__link vireon-global-header__link--active"
                  : "vireon-global-header__link"
              }
            >
              {item.label}
            </Link>
          ))}
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
                href={loginHref(DEFAULT_SIGN_IN_REDIRECT)}
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
