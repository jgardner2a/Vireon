import {
  HomeFinalAuthActions,
  HomeHeroAuthActions,
} from "@/app/components/PublicAuthLinks";
import { HomeHeroGraphic } from "@/app/components/brand/HomeHeroGraphic";
import "./home.css";

export const metadata = {
  title: "Vireon — Property documentation for residents",
  description:
    "Organize maintenance logs, communications, photos, and documents in one workspace. Build a clear record of your home over time.",
};

const WHAT_WE_DO = [
  {
    title: "One workspace per property",
    text: "Keep maintenance, complex issues, communications, notes, gallery photos, and key documents together instead of scattered across texts, email, and camera rolls.",
  },
  {
    title: "Structured evidence logs",
    text: "Record what happened, when it happened, and attach photos as you go—so you have a timeline you can revisit later.",
  },
  {
    title: "Exports when you need them",
    text: "Compile selected records into an Evidence Package download. Vireon organizes what you choose; it does not provide legal advice or verify your content.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Set up My Home",
    text: "Add your property and store lease or insurance documents in one place.",
  },
  {
    step: "2",
    title: "Log as you live there",
    text: "Create maintenance, complex, communication, and note entries—with photos attached when it helps.",
  },
  {
    step: "3",
    title: "Review in the Vault",
    text: "See a read-only summary of documented evidence for your active property (Pro).",
  },
  {
    step: "4",
    title: "Export if needed",
    text: "Generate an Evidence Package from the records you select, on your timeline.",
  },
];

const FEATURES = [
  {
    title: "Maintenance logs",
    text: "Track repairs, safety concerns, and landlord communication with dated entries and images.",
  },
  {
    title: "Complex & communications",
    text: "Document building-wide issues and apartment-related conversations in separate, searchable logs.",
  },
  {
    title: "Gallery",
    text: "Upload and organize photos, then link them to evidence logs when they support your record.",
  },
  {
    title: "Move-in/out snapshots",
    text: "Room-by-room move-in and move-out documentation (Pro).",
  },
  {
    title: "Vault & insights",
    text: "A consolidated view of your documentation and future trend summaries (Pro).",
  },
  {
    title: "Evidence Package",
    text: "Download a package of selected records and files—Free via one-time purchase, included with Pro.",
  },
];

const AUDIENCE = [
  {
    title: "Renters",
    text: "Build a clear paper trail for maintenance requests, move-in condition, and move-out disputes.",
  },
  {
    title: "Homeowners",
    text: "Keep warranty work, contractor visits, and home improvements organized over the years.",
  },
  {
    title: "Anyone documenting a property",
    text: "If you need a personal, structured record—not a property manager tool—Vireon is built for you.",
  },
];

export default function HomePage() {
  return (
    <div className="vireon-route-fill vireon-home">
      <div className="vireon-home__inner">
        <section className="vireon-home-hero" aria-labelledby="home-hero-title">
          <div className="vireon-home-hero__grid">
            <div className="vireon-home-hero__content">
              <p className="vireon-home-hero__eyebrow">Property documentation</p>
              <h1 id="home-hero-title" className="vireon-home-hero__title">
                Your home record, organized over time
              </h1>
              <p className="vireon-home-hero__lead">
                Vireon helps residents document maintenance, communications, photos,
                and files in one workspace—so you are prepared when questions come
                up later.
              </p>
              <ul className="vireon-home-hero__points">
                <li>Log issues and uploads as they happen</li>
                <li>Keep photos and documents tied to your property</li>
                <li>Export an Evidence Package when you need a shareable bundle</li>
              </ul>
              <HomeHeroAuthActions />
            </div>
            <HomeHeroGraphic className="vireon-home-hero__graphic" />
          </div>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-what-heading"
        >
          <p className="vireon-home-section__label">What we do</p>
          <h2 id="home-what-heading" className="vireon-home-section__title">
            Documentation you control
          </h2>
          <p className="vireon-home-section__intro">
            Vireon is a recordkeeping tool for people living in a property—not
            legal services, property management, or inspection certification. You
            add the facts; the app keeps them structured and easy to find.
          </p>
          <div className="vireon-home-features">
            {WHAT_WE_DO.map((item) => (
              <article key={item.title} className="vireon-home-feature-card">
                <h3 className="vireon-home-feature-card__title">{item.title}</h3>
                <p className="vireon-home-feature-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-how-heading"
        >
          <p className="vireon-home-section__label">How it works</p>
          <h2 id="home-how-heading" className="vireon-home-section__title">
            From move-in to export
          </h2>
          <p className="vireon-home-section__intro">
            Start free with one property. Upgrade to Pro when you need multiple
            homes, Snapshots, Vault, Insights, or an included annual export.
          </p>
          <ol className="vireon-home-steps">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="vireon-home-step">
                <span className="vireon-home-step__number" aria-hidden="true">
                  {item.step}
                </span>
                <h3 className="vireon-home-step__title">{item.title}</h3>
                <p className="vireon-home-step__text">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-features-heading"
        >
          <p className="vireon-home-section__label">Features</p>
          <h2 id="home-features-heading" className="vireon-home-section__title">
            Built for real rental and home life
          </h2>
          <p className="vireon-home-section__intro">
            Core evidence logs and gallery are available on Free. Premium modules
            unlock with Pro—preview them in the app before you upgrade.
          </p>
          <div className="vireon-home-features">
            {FEATURES.map((item) => (
              <article key={item.title} className="vireon-home-feature-card">
                <h3 className="vireon-home-feature-card__title">{item.title}</h3>
                <p className="vireon-home-feature-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="vireon-home-section"
          aria-labelledby="home-who-heading"
        >
          <p className="vireon-home-section__label">Who it&apos;s for</p>
          <h2 id="home-who-heading" className="vireon-home-section__title">
            Residents, not landlords
          </h2>
          <p className="vireon-home-section__intro">
            Vireon is designed for the person living in the home who wants their
            own organized copy of what happened and when.
          </p>
          <div className="vireon-home-audience">
            {AUDIENCE.map((item) => (
              <article key={item.title} className="vireon-home-audience__item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="vireon-home-final" aria-labelledby="home-final-heading">
          <h2 id="home-final-heading" className="vireon-home-final__title">
            Start documenting today
          </h2>
          <p className="vireon-home-final__text">
            Create a free account in minutes. No credit card required. Add your
            property and your first log when something worth remembering happens.
          </p>
          <HomeFinalAuthActions />
        </section>
      </div>
    </div>
  );
}
