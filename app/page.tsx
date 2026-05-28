import Link from "next/link";
import { loginHref, ROUTE_DASHBOARD } from "@/lib/appNavigation";
import "./home.css";

export default function HomePage() {
  return (
    <div className="vireon-route-fill vireon-home">
      <div className="vireon-home__inner">
        <section className="vireon-home-hero" aria-labelledby="home-hero-title">
          <p className="vireon-home-hero__eyebrow">Vireon</p>
          <h1 id="home-hero-title" className="vireon-home-hero__title">
            Sign in to continue
          </h1>
          <p className="vireon-home-hero__lead">
            Manage your property workspace — maintenance, notes, photos, and
            documents in one place.
          </p>
          <div className="vireon-home-cta-row">
            <Link
              href={loginHref(ROUTE_DASHBOARD)}
              className="vireon-home-btn-primary"
            >
              Sign in
            </Link>
            <Link
              href={loginHref(ROUTE_DASHBOARD, { signup: true })}
              className="vireon-home-btn-secondary"
            >
              Create account
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
