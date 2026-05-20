import { AppLayout } from "./components/layout/AppLayout";
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
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
