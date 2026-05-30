"use client";

import { getPlanDefinition } from "@/lib/billing/planConfig";
import type { PlanTier } from "@/lib/billing/types";

type PlanSectionProps = {
  loading: boolean;
  plan: PlanTier | null;
};

export function PlanSection({ loading, plan }: PlanSectionProps) {
  const planLoading = loading || plan === null;
  const activePlan: PlanTier = plan ?? "free";
  const planDefinition = getPlanDefinition(activePlan);

  return (
    <section
      className="settings-section"
      aria-labelledby="settings-plan-heading"
    >
      <h2 id="settings-plan-heading" className="settings-section-title">
        Plan
      </h2>

      <div className="settings-card">
        <div className="settings-field">
          <span className="settings-field-label">Current plan</span>
          {planLoading ? (
            <p className="settings-field-value">Loading…</p>
          ) : (
            <>
              <p className="settings-plan-row">
                <span
                  className={`settings-plan-badge settings-plan-badge--${activePlan}`}
                >
                  {planDefinition.displayName}
                  {planDefinition.priceLabel
                    ? ` · ${planDefinition.priceLabel}`
                    : ""}
                </span>
              </p>
              <p className="settings-field-hint">{planDefinition.description}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
