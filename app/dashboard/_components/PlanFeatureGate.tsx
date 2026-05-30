"use client";

import Link from "next/link";
import {
  EXPORT_ONE_TIME_PRICE_LABEL,
  PRO_ANNUAL_PRICE_LABEL,
  isPlanFeatureEnabled,
  type PlanFeature,
} from "@/lib/billing/planConfig";
import { planFeatureLockedMessage, planUpgradeHint } from "@/lib/billing/planCopy";
import { ROUTE_PLANS } from "@/lib/appNavigation";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import "./plan-feature-gate.css";

type PlanFeatureGateProps = {
  feature: PlanFeature;
  title: string;
  description: string;
  children: React.ReactNode;
};

function PlanFeatureGateOverlay({
  feature,
  title,
}: {
  feature: PlanFeature;
  title: string;
}) {
  return (
    <div
      className="plan-feature-gate-shell__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Upgrade to unlock ${title}`}
    >
      <section
        className="plan-feature-gate-card"
        aria-labelledby="plan-feature-gate-heading"
      >
        <p id="plan-feature-gate-heading" className="plan-feature-gate-badge">
          Pro feature
        </p>
        <p className="plan-feature-gate-copy">
          {planFeatureLockedMessage(feature)}
        </p>
        <p className="plan-feature-gate-copy">{planUpgradeHint()}</p>

        <ul className="plan-feature-gate-options">
          <li>Stay on Free and keep using core evidence logs.</li>
          <li>
            Buy a one-time Evidence Package export ({EXPORT_ONE_TIME_PRICE_LABEL}
            ).
          </li>
          <li>Upgrade to Pro ({PRO_ANNUAL_PRICE_LABEL}).</li>
        </ul>

        <div className="plan-feature-gate-actions">
          <Link href={ROUTE_PLANS} className="plan-feature-gate-btn">
            Upgrade to Pro
          </Link>
        </div>
      </section>
    </div>
  );
}

export function PlanFeatureGate({
  feature,
  title,
  description: _description,
  children,
}: PlanFeatureGateProps) {
  const { state, loading } = useDashboardState();
  const plan = state?.plan ?? "free";
  const unlocked = isPlanFeatureEnabled(plan, feature);

  if (loading) {
    return (
      <div className="dashboard-container">
        <p className="plan-feature-gate-loading" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="plan-feature-gate-shell">
      <div className="plan-feature-gate-shell__preview" inert aria-hidden="true">
        {children}
      </div>
      <PlanFeatureGateOverlay feature={feature} title={title} />
    </div>
  );
}
