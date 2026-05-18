import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <nav style={{ padding: 20, borderBottom: "1px solid #eee" }}>
          <Link href="/" style={{ marginRight: 12 }}>Places</Link>
          <Link href="/my-home">My Home</Link>
        </nav>

        {children}
      </body>
    </html>
  );
}