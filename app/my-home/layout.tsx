import Link from "next/link";

export default function MyHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      {/* SIDEBAR */}
      <aside
        style={{
          width: "260px",
          padding: "20px",
          borderRight: "1px solid #eee",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>My Home</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/my-home">Dashboard</Link>
          <Link href="/my-home/properties">Properties</Link>
          <Link href="/my-home/issues">Issues</Link>
          <Link href="/my-home/vault">Vault</Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: 24 }}>
        {children}
      </main>
    </div>
  );
}