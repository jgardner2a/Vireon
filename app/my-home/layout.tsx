"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MyHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("auth");

    if (!auth) {
      router.push("/login");
    }
  }, [router]);

  const navItems = [
    { href: "/my-home", label: "Dashboard" },
    { href: "/my-home/properties", label: "Properties" },
    { href: "/my-home/issues", label: "Issues" },
    { href: "/my-home/gallery", label: "Gallery" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fafafa" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 260,
          padding: 24,
          borderRight: "1px solid #eaeaea",
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Vireon</h2>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 24 }}>
          Rental Intelligence System
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {navItems.map((item) => {
            const active =
              item.href === "/my-home"
                ? pathname === "/my-home"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "#111" : "#666",
                  background: active ? "#f2f4f7" : "transparent",
                  border: active ? "1px solid #e5e7eb" : "1px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}