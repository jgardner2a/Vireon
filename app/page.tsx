import Link from "next/link";
import {
  loginHref,
  ROUTE_MY_HOME,
  ROUTE_PLACES,
} from "@/lib/appNavigation";
import "./home.css";

const FEATURES = [
  {
    title: "Evidence Vault",
    description:
      "See how issues, media, and documents connect across your rental. A structured record you can return to—not scattered screenshots.",
  },
  {
    title: "Issue Tracking",
    description:
      "Log maintenance problems with clear status and property context. Document issues before they become disputes.",
  },
  {
    title: "Organized Gallery",
    description:
      "Store photos and videos by property and folder. Tie media to the issues they support with evidence links.",
  },
  {
    title: "Rental History",
    description:
      "Keep a current home and previous rentals in one account. Continuity matters when you move often.",
  },
  {
    title: "Structured Exports",
    description:
      "Download evidence packages when you need a snapshot or full documentation for your records.",
  },
] as const;

const AUDIENCE = [
  {
    title: "Renters",
    description:
      "Build a personal housing record that stays with you—not locked inside one landlord’s portal.",
  },
  {
    title: "Apartment residents",
    description:
      "Track recurring maintenance, condition changes, and correspondence-ready evidence over your lease.",
  },
  {
    title: "Frequent movers",
    description:
      "Carry organized history from one place to the next without starting from zero each time.",
  },
  {
    title: "Dispute preparation",
    description:
      "When something goes wrong, you already have dates, issues, and media arranged—not a panic search.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="vireon-route-fill vireon-home">
      <div className="vireon-home__inner">
        <section className="vireon-home-hero" aria-labelledby="home-hero-title">
          <p className="vireon-home-hero__eyebrow">Renter documentation</p>
          <h1 id="home-hero-title" className="vireon-home-hero__title">
            Protect your rental history.
          </h1>
          <p className="vireon-home-hero__lead">
            Vireon helps you organize housing evidence, track issues, and keep
            documentation ready—so small problems are recorded before they grow
            into conflicts.
          </p>
          <ul className="vireon-home-hero__points">
            <li>Document issues before they become disputes.</li>
            <li>Keep your housing evidence organized by property.</li>
            <li>Export records when you need a clear paper trail.</li>
          </ul>
          <div className="vireon-home-cta-row">
            <Link href={ROUTE_MY_HOME} className="vireon-home-btn-primary">
              Open My Home
            </Link>
            <Link
              href={loginHref(ROUTE_MY_HOME, { signup: true })}
              className="vireon-home-btn-secondary"
            >
              Get Started
            </Link>
            <Link
              href={loginHref(ROUTE_MY_HOME)}
              className="vireon-home-btn-secondary"
            >
              Sign In
            </Link>
            <Link href={ROUTE_PLACES} className="vireon-home-btn-secondary">
              Explore Places
            </Link>
          </div>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-features-title"
        >
          <p className="vireon-home-section__label">What you get</p>
          <h2 id="home-features-title" className="vireon-home-section__title">
            Built for evidence, not noise
          </h2>
          <p className="vireon-home-section__intro">
            My Home is your workspace for rental continuity: issues, gallery,
            vault relationships, and exports—scoped to where you live now and
            where you have lived before.
          </p>
          <div className="vireon-home-features">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="vireon-home-feature-card"
              >
                <h3 className="vireon-home-feature-card__title">
                  {feature.title}
                </h3>
                <p className="vireon-home-feature-card__text">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-audience-title"
        >
          <p className="vireon-home-section__label">Who it&apos;s for</p>
          <h2 id="home-audience-title" className="vireon-home-section__title">
            Renters who need records that last
          </h2>
          <p className="vireon-home-section__intro">
            If your housing situation depends on proof—timelines, photos, issue
            history—Vireon is structured around documentation first.
          </p>
          <div className="vireon-home-audience">
            {AUDIENCE.map((item) => (
              <div key={item.title} className="vireon-home-audience__item">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vireon-home-section" aria-labelledby="home-cta-title">
          <div className="vireon-home-final">
            <h2 id="home-cta-title" className="vireon-home-final__title">
              Start your housing record
            </h2>
            <p className="vireon-home-final__text">
              Create an account, sign in, and open My Home to add a property,
              log your first issue, or upload evidence. Explore Places when you
              want to save a location for later.
            </p>
            <div className="vireon-home-cta-row">
              <Link
                href={loginHref(ROUTE_MY_HOME, { signup: true })}
                className="vireon-home-btn-primary"
              >
                Create account
              </Link>
              <Link href={ROUTE_MY_HOME} className="vireon-home-btn-secondary">
                Open My Home
              </Link>
              <Link
                href={loginHref(ROUTE_MY_HOME)}
                className="vireon-home-btn-secondary"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
