import Link from "next/link";
import {
  DEFAULT_SIGN_IN_REDIRECT,
  loginHref,
  ROUTE_DASHBOARD,
  ROUTE_HOME,
} from "@/lib/appNavigation";
import "./footer.css";

const PRODUCT_LINKS = [
  { href: ROUTE_HOME, label: "Home" },
  { href: ROUTE_DASHBOARD, label: "Dashboard" },
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
            Sign in, sign up, and a minimal workspace shell.
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
                href={loginHref(ROUTE_DASHBOARD, { signup: true })}
                className="vireon-global-footer__link"
              >
                Get Started
              </Link>
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
