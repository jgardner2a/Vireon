import Link from "next/link";
import {
  loginHref,
  ROUTE_MY_HOME,
} from "@/lib/appNavigation";
import "./home.css";

export default function HomePage() {
  return (
    <div className="vireon-route-fill vireon-home">
      <div className="vireon-home__inner">
        <section className="vireon-home-hero" aria-labelledby="home-hero-title">
          <p className="vireon-home-hero__eyebrow">Vireon</p>
          <h1 id="home-hero-title" className="vireon-home-hero__title">
            Sign in to open My Home
          </h1>
          <p className="vireon-home-hero__lead">
            This build includes authentication and the My Home workspace shell
            only.
          </p>
          <div className="vireon-home-cta-row">
            <Link href={loginHref(ROUTE_MY_HOME)} className="vireon-home-btn-primary">
              Sign in
            </Link>
            <Link
              href={loginHref(ROUTE_MY_HOME, { signup: true })}
              className="vireon-home-btn-secondary"
            >
              Create account
            </Link>
            <Link href={ROUTE_MY_HOME} className="vireon-home-btn-secondary">
              My Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
