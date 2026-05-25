"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  loginHref,
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_MY_HOME,
  ROUTE_DASHBOARD_MY_HOME_GALLERY,
  ROUTE_DASHBOARD_MY_HOME_ISSUES,
  ROUTE_DASHBOARD_MY_HOME_NOTES,
  ROUTE_DASHBOARD_MY_HOME_VAULT,
} from "@/lib/appNavigation";
import { fetchAuthSession, initAuthSessionListener } from "@/lib/authSession";
import "./dashboard.css";

function navLinkClass(active: boolean) {
  return active
    ? "dashboard-nav-link dashboard-nav-link--active"
    : "dashboard-nav-link";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuthSessionListener();

    void fetchAuthSession()
      .then((session) => {
        if (!session?.userId) {
          window.location.href = loginHref(ROUTE_DASHBOARD);
        }
      })
      .catch((error) => {
        console.error("[dashboard] auth check failed", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const overviewActive = pathname === ROUTE_DASHBOARD;
  const myHomeActive = pathname === ROUTE_DASHBOARD_MY_HOME;
  const galleryActive = pathname === ROUTE_DASHBOARD_MY_HOME_GALLERY;
  const issuesActive = pathname === ROUTE_DASHBOARD_MY_HOME_ISSUES;
  const notesActive = pathname === ROUTE_DASHBOARD_MY_HOME_NOTES;
  const vaultActive = pathname === ROUTE_DASHBOARD_MY_HOME_VAULT;

  if (loading) {
    return <div className="dashboard-loading">Loading…</div>;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href={ROUTE_DASHBOARD} className="dashboard-brand">
          Vireon
        </Link>

        <p className="dashboard-nav-label">Menu</p>
        <nav className="dashboard-nav" aria-label="Dashboard">
          <Link
            href={ROUTE_DASHBOARD}
            className={navLinkClass(overviewActive)}
          >
            Overview
          </Link>

          <Link
            href={ROUTE_DASHBOARD_MY_HOME}
            className={navLinkClass(myHomeActive)}
          >
            My Home
          </Link>

          <div className="dashboard-nav-sub">
            <Link
              href={ROUTE_DASHBOARD_MY_HOME_GALLERY}
              className={navLinkClass(galleryActive)}
            >
              Gallery
            </Link>
            <Link
              href={ROUTE_DASHBOARD_MY_HOME_ISSUES}
              className={navLinkClass(issuesActive)}
            >
              Issues
            </Link>
            <Link
              href={ROUTE_DASHBOARD_MY_HOME_NOTES}
              className={navLinkClass(notesActive)}
            >
              Notes
            </Link>
            <Link
              href={ROUTE_DASHBOARD_MY_HOME_VAULT}
              className={navLinkClass(vaultActive)}
            >
              Vault
            </Link>
          </div>
        </nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
