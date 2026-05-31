import Link from "next/link";
import { VireonLogo } from "@/app/components/brand/VireonLogo";
import { FooterAccessLinks } from "@/app/components/PublicAuthLinks";
import {
  ROUTE_ACCOUNT_DELETION,
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_SETTINGS,
  ROUTE_HOME,
  ROUTE_PLANS,
  ROUTE_PRIVACY,
  ROUTE_TERMS,
} from "@/lib/appNavigation";
import "./footer.css";

const PRODUCT_LINKS = [
  { href: ROUTE_HOME, label: "Home" },
  { href: ROUTE_PLANS, label: "Plans" },
  { href: ROUTE_DASHBOARD, label: "Dashboard" },
  { href: ROUTE_DASHBOARD_SETTINGS, label: "Settings" },
] as const;

const LEGAL_LINKS = [
  { href: ROUTE_PRIVACY, label: "Privacy Policy" },
  { href: ROUTE_TERMS, label: "Terms of Service" },
  { href: ROUTE_ACCOUNT_DELETION, label: "Account Deletion" },
] as const;

export function GlobalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="vireon-global-footer" role="contentinfo">
      <div className="vireon-global-footer__grid">
        <div className="vireon-global-footer__col">
          <div className="vireon-global-footer__brand">
            <VireonLogo size="sm" href={ROUTE_HOME} />
          </div>
          <p className="vireon-global-footer__tagline">
            Property documentation and recordkeeping for residents.
          </p>
        </div>

        <div className="vireon-global-footer__col">
          <h2 className="vireon-global-footer__heading">Product</h2>
          <ul className="vireon-global-footer__links">
            {PRODUCT_LINKS.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="vireon-global-footer__link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="vireon-global-footer__col">
          <h2 className="vireon-global-footer__heading">Legal</h2>
          <ul className="vireon-global-footer__links">
            {LEGAL_LINKS.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="vireon-global-footer__link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="vireon-global-footer__col">
          <h2 className="vireon-global-footer__heading">Access</h2>
          <FooterAccessLinks />
        </div>
      </div>

      <div className="vireon-global-footer__bar">
        <p className="vireon-global-footer__copyright">
          © {year} Vireon. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
