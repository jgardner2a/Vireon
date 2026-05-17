import Link from "next/link";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>

        <div style={{ display: "flex", height: "100vh" }}>

          {/* SIDEBAR */}
          <aside style={{
            width: 260,
            borderRight: "1px solid #ddd",
            padding: 20
          }}>
            <h2>Vireon</h2>

            <nav style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 20
            }}>
              <Link href="/">Dashboard</Link>
              <Link href="/places">Places</Link>
              <Link href="/vault">Vault</Link>
              <Link href="/iq">IQ Score</Link>
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1, padding: 20 }}>
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}