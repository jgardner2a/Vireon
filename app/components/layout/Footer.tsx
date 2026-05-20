import Link from "next/link";
import {
  DEFAULT_SIGN_IN_REDIRECT,
  loginHref,
  ROUTE_MY_HOME,
  ROUTE_PLACES,
} from "@/lib/appNavigation";
import "./footer.css";

const PRODUCT_LINKS = [
  { href: ROUTE_MY_HOME, label: "My Home" },
  { href: ROUTE_PLACES, label: "Places" },
  { href: "/my-home/vault", label: "Vault" },
  { href: "/my-home/issues", label: "Issues" },
  { href: "/my-home/gallery", label: "Gallery" },
  { href: "/my-home/vault", label: "Exports" },
] as const;

const RENTER_TOPICS = [
  "Move-in documentation",
  "Maintenance tracking",
  "Rental continuity",
  "Evidence organization",
  "Deposit protection",
  "Housing records",
] as const;

export function GlobalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="vireon-global-footer" role="contentinfo">
      <div className="vireon-global-footer__grid">
        <div className="vireon-global-footer__col">
          <div className="vireon-global-footer__brand">
            <span className="vireon-global-footer__mark" aria-hidden>
              V
            </span>
            <span className="vireon-global-footer__name">Vireon</span>
          </div>
          <p className="vireon-global-footer__tagline">
            Protect your rental history. Organize housing records, document
            issues and evidence, and keep structured renter documentation in one
            place.
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
          <h2 className="vireon-global-footer__heading">Renters</h2>
          <ul className="vireon-global-footer__list-plain">
            {RENTER_TOPICS.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>

        <div className="vireon-global-footer__col">
          <h2 className="vireon-global-footer__heading">Access</h2>
          <ul className="vireon-global-footer__links">
            <li>
              <Link
                href={loginHref(DEFAULT_SIGN_IN_REDIRECT)}
                className="vireon-global-footer__link"
              >
                Sign In
              </Link>
            </li>
            <li>
              <Link
                href={loginHref(ROUTE_MY_HOME, { signup: true })}
                className="vireon-global-footer__link"
              >
                Get Started
              </Link>
            </li>
            <li>
              <span className="vireon-global-footer__text-muted">Pricing</span>
            </li>
            <li>
              <span className="vireon-global-footer__text-muted">Privacy</span>
            </li>
            <li>
              <span className="vireon-global-footer__text-muted">Terms</span>
            </li>
            <li>
              <span className="vireon-global-footer__text-muted">Contact</span>
            </li>
          </ul>
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
