"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VireonLogo } from "@/app/components/brand/VireonLogo";
import { clearAuthSession } from "@/lib/authSession";
import {
  APP_TOP_NAV_ITEMS,
  DEFAULT_SIGN_IN_REDIRECT,
  isAppNavActive,
  loginHref,
} from "@/lib/appNavigation";
import { useAuthSession } from "@/lib/useAuthSession";
import { GlobalHeaderPlan } from "./GlobalHeaderPlan";

function syncGlobalHeaderHeight(header: HTMLElement) {
  document.documentElement.style.setProperty(
    "--vireon-global-header-height",
    `${header.offsetHeight}px`,
  );
}

/** App-wide header — sole location for auth actions (app/layout.tsx). */
export function GlobalHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const { email, isAuthenticated } = useAuthSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return;
    }

    syncGlobalHeaderHeight(header);

    const observer = new ResizeObserver(() => {
      syncGlobalHeaderHeight(header);
    });
    observer.observe(header);

    return () => observer.disconnect();
  }, [mounted, isAuthenticated, email]);

  const handleLogout = () => {
    void clearAuthSession().then(() => {
      window.location.href = "/login";
    });
  };

  return (
    <header ref={headerRef} className="vireon-global-header">
      <div className="vireon-global-header__bar">
        <div className="vireon-global-header__start">
          <VireonLogo size="sm" />
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
        </div>

        <div className="vireon-global-header__auth">
          {mounted &&
            (isAuthenticated ? (
              <>
                <GlobalHeaderPlan />
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
