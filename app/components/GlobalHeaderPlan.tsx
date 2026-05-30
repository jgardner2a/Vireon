"use client";

import Link from "next/link";
import { getPlanDefinition } from "@/lib/billing/planConfig";
import { ROUTE_PLANS } from "@/lib/appNavigation";
import { useOptionalDashboardState } from "@/lib/dashboard/dashboardContext";
import { useAuthSession } from "@/lib/useAuthSession";

export function GlobalHeaderPlan() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession();
  const dashboard = useOptionalDashboardState();

  if (!isAuthenticated || isAuthLoading || !dashboard) {
    return null;
  }

  const { state, loading } = dashboard;
  const plan = state?.plan ?? "free";
  const planDefinition = getPlanDefinition(plan);

  return (
    <div className="vireon-global-header__plan">
      {loading && !state ? (
        <span className="vireon-global-header__plan-loading">Plan…</span>
      ) : (
        <>
          <span
            className={`vireon-global-header__plan-badge vireon-global-header__plan-badge--${plan}`}
          >
            {planDefinition.displayName}
          </span>
          {plan === "free" ? (
            <Link href={ROUTE_PLANS} className="vireon-global-header__upgrade">
              Upgrade to Pro
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
