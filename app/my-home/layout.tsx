"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loginHref, ROUTE_HOME, ROUTE_MY_HOME } from "@/lib/appNavigation";
import { fetchAuthSession, initAuthSessionListener } from "@/lib/authSession";
import { PropertyContextProvider } from "./hooks/usePropertyContext";
import "./my-home.css";

export default function MyHomeLayout({
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
          window.location.href = loginHref(ROUTE_MY_HOME);
        }
      })
      .catch((error) => {
        console.error("[my-home] auth check failed", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const navItems = [{ href: "/my-home", label: "Dashboard" }];

  function isNavActive(href: string) {
    if (href === "/my-home") {
      return pathname === "/my-home";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (loading) {
    return <div className="my-home-loading">Loading…</div>;
  }

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

          <p className="my-home-nav-label">Menu</p>
          <nav className="my-home-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isNavActive(item.href)
                    ? "my-home-nav-link my-home-nav-link--active"
                    : "my-home-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="my-home-main">
        <PropertyContextProvider>
          <div className="my-home-page">{children}</div>
        </PropertyContextProvider>
      </main>
    </div>
  );
}
