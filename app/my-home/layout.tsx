"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { bootstrapMyHomeData } from "@/lib/myHomeBootstrap";
import "./my-home.css";

export default function MyHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("auth");

    if (!auth) {
      window.location.href = "/login";
      return;
    }

    void bootstrapMyHomeData()
      .catch((error) => {
        console.error("[my-home] bootstrap failed", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const navItems = [
    { href: "/my-home", label: "Dashboard" },
    { href: "/my-home/properties", label: "Properties" },
    { href: "/my-home/issues", label: "Issues" },
    { href: "/my-home/gallery", label: "Gallery" },
    { href: "/my-home/vault", label: "Vault" },
  ];

  const utilityNavItems = [
    { href: "/my-home/move-in-checklist", label: "Move-In Checklist" },
    { href: "/my-home/move-out-checklist", label: "Move-Out Checklist" },
  ];

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
    <div className="my-home-shell">
      <aside className="my-home-sidebar">
        <div className="my-home-sidebar-scroll">
          <div className="my-home-brand">
            <div className="my-home-brand-mark">V</div>
            <div>
              <p className="my-home-brand-name">Vireon</p>
              <p className="my-home-brand-tag">Rental intelligence</p>
            </div>
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

          <p className="my-home-nav-label" style={{ marginTop: 20 }}>
            Tools
          </p>
          <nav className="my-home-nav">
            {utilityNavItems.map((item) => (
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
        <div className="my-home-page">{children}</div>
      </main>
    </div>
  );
}
