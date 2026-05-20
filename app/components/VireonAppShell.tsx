"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAppNavActive, ROUTE_HOME } from "@/lib/appNavigation";

export type VireonAppShellNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export type VireonAppShellProps = {
  /** Workspace-only links (not Home / Places / My Home — those are in GlobalHeader). */
  navItems?: VireonAppShellNavItem[];
  navLabel?: string;
  utilityNavItems?: VireonAppShellNavItem[];
  utilityNavLabel?: string;
  /** Optional block between brand and primary nav (e.g. Places contextual links). */
  sidebarContent?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  fullBleedMain?: boolean;
  sidebarFooter?: ReactNode;
};

export function VireonAppShell({
  navItems = [],
  navLabel = "Menu",
  utilityNavItems = [],
  utilityNavLabel = "Tools",
  sidebarContent,
  children,
  mainClassName = "",
  fullBleedMain = false,
  sidebarFooter,
}: VireonAppShellProps) {
  const pathname = usePathname();

  return (
    <div className="my-home-shell vireon-workspace-shell">
      <aside className="my-home-sidebar">
        <div className="my-home-sidebar-scroll">
          <div className="my-home-brand">
            <Link href={ROUTE_HOME} className="my-home-brand-link">
              <div className="my-home-brand-mark">V</div>
              <div>
                <p className="my-home-brand-name">Vireon</p>
                <p className="my-home-brand-tag">Rental intelligence</p>
              </div>
            </Link>
          </div>

          {sidebarContent}

          {navItems.length > 0 ? (
            <>
              <p className="my-home-nav-label">{navLabel}</p>
              <nav className="my-home-nav" aria-label={navLabel}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isAppNavActive(pathname, item.href, item.exact)
                        ? "my-home-nav-link my-home-nav-link--active"
                        : "my-home-nav-link"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : null}

          {utilityNavItems.length > 0 ? (
            <>
              <p className="my-home-nav-label" style={{ marginTop: 20 }}>
                {utilityNavLabel}
              </p>
              <nav className="my-home-nav" aria-label={utilityNavLabel}>
                {utilityNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isAppNavActive(pathname, item.href, item.exact)
                        ? "my-home-nav-link my-home-nav-link--active"
                        : "my-home-nav-link"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : null}

          {sidebarFooter ? (
            <div className="my-home-sidebar-footer">{sidebarFooter}</div>
          ) : null}
        </div>
      </aside>

      <main className={`my-home-main ${mainClassName}`.trim()}>
        {fullBleedMain ? (
          <div className="vireon-app-shell-page vireon-app-shell-page--full">
            {children}
          </div>
        ) : (
          <div className="my-home-page">{children}</div>
        )}
      </main>
    </div>
  );
}
