import {
  EXPORT_ONE_TIME_PRICE_LABEL,
  getPlanDefinition,
  PRO_ANNUAL_PRICE_LABEL,
} from "@/lib/billing/planConfig";
import type { PlanTier } from "@/lib/billing/types";
import { PlansFreeCardActions } from "@/app/components/PublicAuthLinks";
import "./plans.css";

export const metadata = {
  title: "Plans · Vireon",
  description:
    "Compare Free and Pro plans for property documentation, evidence logs, and exports.",
};

const PLAN_ORDER: PlanTier[] = ["free", "pro"];

/** Marketing copy for /plans only — not used for enforcement. */
const PLANS_PAGE_FEATURE_LINES: Record<PlanTier, string[]> = {
  free: [
    "1 property",
    "5 evidence logs",
    `Evidence export via one-time purchase (${EXPORT_ONE_TIME_PRICE_LABEL}) or Pro`,
    "Limited photo gallery uploads",
    "Snapshots locked",
    "Vault locked",
    "Insights locked",
  ],
  pro: [
    "Multiple properties",
    "No limit on evidence logs",
    "Full access to gallery",
    "Full access to Move-in/Out Snapshots",
    "Full access to Vault",
    "Full access to Apartment Complex Insights",
    "Evidence Export Package Included",
  ],
};

function planPriceLabel(plan: PlanTier): string {
  const definition = getPlanDefinition(plan);
  if (plan === "free") {
    return "Free";
  }

  return definition.priceLabel ?? PRO_ANNUAL_PRICE_LABEL;
}

export default function PlansPage() {
  return (
    <div className="vireon-route-fill vireon-plans">
      <div className="vireon-plans__inner">
        <header className="vireon-plans-hero">
          <p className="vireon-plans-hero__eyebrow">Pricing</p>
          <h1 className="vireon-plans-hero__title">Choose the plan that fits</h1>
          <p className="vireon-plans-hero__lead">
            Start free with one property and core evidence logs. Upgrade to Pro
            for unlimited properties, premium modules, and an included annual
            Evidence Package export.
          </p>
        </header>

        <section aria-labelledby="plans-comparison-heading">
          <h2 id="plans-comparison-heading" className="sr-only">
            Plan comparison
          </h2>

          <div className="vireon-plans-grid">
            {PLAN_ORDER.map((plan) => {
              const definition = getPlanDefinition(plan);
              const summaryLines = PLANS_PAGE_FEATURE_LINES[plan];
              const isPro = plan === "pro";

              return (
                <article
                  key={plan}
                  className={
                    isPro
                      ? "vireon-plans-card vireon-plans-card--featured"
                      : "vireon-plans-card"
                  }
                  aria-labelledby={`plan-${plan}-name`}
                >
                  {isPro ? (
                    <span className="vireon-plans-card__badge">Most complete</span>
                  ) : null}

                  <h3 id={`plan-${plan}-name`} className="vireon-plans-card__name">
                    {definition.displayName}
                  </h3>
                  {plan !== "free" ? (
                    <p className="vireon-plans-card__price">
                      {planPriceLabel(plan)}
                    </p>
                  ) : null}
                  {plan === "free" ? (
                    <p className="vireon-plans-card__price-note">
                      No credit card required
                    </p>
                  ) : null}

                  <p className="vireon-plans-card__description">
                    {definition.description}
                  </p>

                  <ul className="vireon-plans-card__features">
                    {summaryLines.map((line) => {
                      const locked =
                        line.includes("locked") || line.startsWith("Limited");

                      return (
                        <li
                          key={line}
                          className={locked ? "is-locked" : undefined}
                        >
                          {line}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="vireon-plans-card__actions">
                    {plan === "free" ? (
                      <PlansFreeCardActions />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="vireon-plans-btn vireon-plans-btn--primary"
                          disabled
                          aria-describedby="plans-checkout-hint"
                        >
                          Upgrade to Pro
                        </button>
                        <p id="plans-checkout-hint" className="vireon-plans-card__hint">
                          Online checkout is not available yet. Plan details are
                          listed here for reference.
                        </p>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="vireon-plans-export"
          aria-labelledby="plans-export-heading"
        >
          <h2 id="plans-export-heading" className="vireon-plans-export__title">
            One-time Evidence Package export
          </h2>
          <p className="vireon-plans-export__lead">
            Need a single export without Pro? Purchase a one-time Evidence
            Package credit. Pro includes one export per year at{" "}
            {PRO_ANNUAL_PRICE_LABEL}.
          </p>
          <div className="vireon-plans-export__row">
            <span className="vireon-plans-export__price">
              {EXPORT_ONE_TIME_PRICE_LABEL}
            </span>
            <button
              type="button"
              className="vireon-plans-btn vireon-plans-btn--secondary"
              disabled
              aria-describedby="plans-export-checkout-hint"
            >
              Buy export
            </button>
          </div>
          <p id="plans-export-checkout-hint" className="vireon-plans-card__hint">
            Checkout coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}
