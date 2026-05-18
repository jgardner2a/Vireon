"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./my-home.css";

export default function MyHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("auth");

    if (!auth) {
      window.location.href = "/login";
    } else {
      try {
        const parsed = JSON.parse(auth);
        setEmail(parsed.email ?? null);
      } catch {
        setEmail(null);
      }
      setLoading(false);
    }
  }, []);

  const navItems = [
    { href: "/my-home", label: "Dashboard" },
    { href: "/my-home/properties", label: "Properties" },
    { href: "/my-home/issues", label: "Issues" },
    { href: "/my-home/gallery", label: "Gallery" },
    { href: "/my-home/vault", label: "Vault" },
  ];

  if (loading) {
    return <div className="my-home-loading">Loading…</div>;
  }

  return (
    <div
      className="my-home-shell"
      style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}
    >
      <aside className="my-home-sidebar">
        <div className="my-home-brand">
          <div className="my-home-brand-mark">V</div>
          <div>
            <p className="my-home-brand-name">Vireon</p>
            <p className="my-home-brand-tag">Rental intelligence</p>
          </div>
        </div>

        <p className="my-home-nav-label">Menu</p>
        <nav className="my-home-nav">
          {navItems.map((item) => {
            const active =
              item.href === "/my-home"
                ? pathname === "/my-home"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "my-home-nav-link my-home-nav-link--active"
                    : "my-home-nav-link"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="my-home-sidebar-footer">
          {email && <p className="my-home-user-email">{email}</p>}
          <button
            type="button"
            className="my-home-btn-ghost"
            onClick={() => {
              localStorage.removeItem("auth");
              window.location.href = "/login";
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="my-home-main">{children}</main>
    </div>
  );
}
