"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  loginHref,
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_MY_HOME,
  ROUTE_HOME,
} from "@/lib/appNavigation";
import { fetchAuthSession, initAuthSessionListener } from "@/lib/authSession";
import "./dashboard.css";

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

  if (loading) {
    return <div className="dashboard-loading">Loading…</div>;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href={ROUTE_HOME} className="dashboard-brand">
          Vireon
        </Link>
        <p className="dashboard-nav-label">Menu</p>
        <nav>
          <Link
            href={ROUTE_DASHBOARD}
            className={
              pathname === ROUTE_DASHBOARD
                ? "dashboard-nav-link dashboard-nav-link--active"
                : "dashboard-nav-link"
            }
          >
            Overview
          </Link>
          <Link
            href={ROUTE_DASHBOARD_MY_HOME}
            className={
              pathname === ROUTE_DASHBOARD_MY_HOME ||
              pathname.startsWith(`${ROUTE_DASHBOARD_MY_HOME}/`)
                ? "dashboard-nav-link dashboard-nav-link--active"
                : "dashboard-nav-link"
            }
          >
            My Home
          </Link>
        </nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
