import type { ReactNode } from "react";
import { GlobalFooter } from "./Footer";

/**
 * Global app chrome: scrollable main region + footer.
 * Mounted once from app/layout.tsx — do not add GlobalFooter to individual pages.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vireon-app-shell">
      <div className="vireon-app-body">
        <div className="vireon-app-body__main">{children}</div>
        <GlobalFooter />
      </div>
    </div>
  );
}
