"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  loginHref,
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_COMMUNICATIONS,
  ROUTE_DASHBOARD_GALLERY,
  ROUTE_DASHBOARD_MAINTENANCE,
  ROUTE_DASHBOARD_MY_HOME,
  ROUTE_DASHBOARD_NOTES,
  ROUTE_DASHBOARD_VAULT,
} from "@/lib/appNavigation";
import { DashboardProvider } from "@/lib/dashboard/dashboardContext";
import { useAuthSession } from "@/lib/useAuthSession";
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
  const [hash, setHash] = useState("");
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession();

  useEffect(() => {
    if (isAuthLoading || isAuthenticated) {
      return;
    }

    window.location.href = loginHref(ROUTE_DASHBOARD);
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const onDashboardRoute = pathname === ROUTE_DASHBOARD;
  const dashboardActive = onDashboardRoute && hash === "";
  const myHomeActive = pathname === ROUTE_DASHBOARD_MY_HOME;
  const previousHomesActive = onDashboardRoute && hash === "#previous-homes";
  const galleryActive = pathname === ROUTE_DASHBOARD_GALLERY;
  const maintenanceActive = pathname === ROUTE_DASHBOARD_MAINTENANCE;
  const communicationsActive = pathname === ROUTE_DASHBOARD_COMMUNICATIONS;
  const notesActive = pathname === ROUTE_DASHBOARD_NOTES;
  const vaultActive = pathname === ROUTE_DASHBOARD_VAULT;

  return (
    <div className="dashboard-shell">
      {isAuthLoading ? (
        <p className="dashboard-auth-banner" role="status" aria-live="polite">
          Checking session…
        </p>
      ) : null}
      <aside className="dashboard-sidebar">
        <Link href={ROUTE_DASHBOARD} className="dashboard-brand">
          Vireon
        </Link>

        <p className="dashboard-nav-label">Menu</p>
        <nav className="dashboard-nav" aria-label="Dashboard">
          <Link
            href={ROUTE_DASHBOARD}
            className={navLinkClass(dashboardActive)}
          >
            Dashboard
          </Link>

          <div className="dashboard-nav-sub" aria-label="Dashboard modules">
            <div className="dashboard-nav-section" aria-label="Core Modules">
              <p className="dashboard-nav-section-title">Core Modules</p>
              <div className="dashboard-nav-sub">
                <Link
                  href={ROUTE_DASHBOARD_MY_HOME}
                  className={navLinkClass(myHomeActive)}
                >
                  My Home
                </Link>
                <Link
                  href={ROUTE_DASHBOARD_GALLERY}
                  className={navLinkClass(galleryActive)}
                >
                  Gallery
                </Link>
                <Link
                  href={ROUTE_DASHBOARD_MAINTENANCE}
                  className={navLinkClass(maintenanceActive)}
                >
                  Maintenance
                </Link>
                <Link
                  href={ROUTE_DASHBOARD_COMMUNICATIONS}
                  className={navLinkClass(communicationsActive)}
                >
                  Communications
                </Link>
                <Link
                  href={ROUTE_DASHBOARD_NOTES}
                  className={navLinkClass(notesActive)}
                >
                  Notes
                </Link>
                <Link
                  href={ROUTE_DASHBOARD_VAULT}
                  className={navLinkClass(vaultActive)}
                >
                  Vault
                </Link>
              </div>
            </div>

            <Link
              href={`${ROUTE_DASHBOARD}#previous-homes`}
              className={navLinkClass(previousHomesActive)}
            >
              Property History
            </Link>
          </div>
        </nav>
      </aside>
      <main className="dashboard-main">
        <DashboardProvider>{children}</DashboardProvider>
      </main>
    </div>
  );
}
