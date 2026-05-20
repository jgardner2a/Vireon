import { GlobalHeader } from "./components/GlobalHeader";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GlobalHeader />
        <div className="vireon-app-shell">
          <div className="vireon-app-body">{children}</div>
        </div>
      </body>
    </html>
  );
}
