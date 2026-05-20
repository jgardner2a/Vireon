"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AUTH_CHANGED_EVENT } from "@/lib/authSession";
import { buildDashboardModel, type DashboardModel } from "@/lib/insights";
import {
  useProfileId,
  useSubscriptionPlan,
} from "@/lib/subscription/useSubscriptionPlan";
import { AddPropertyButton } from "./components/AddPropertyButton";
import { usePropertyCreationLimit } from "./hooks/usePropertyCreationLimit";
import { ActiveIssuesPreview } from "./components/dashboard/ActiveIssuesPreview";
import { PropertySummarySection } from "./components/dashboard/PropertySummarySection";
import { RecentActivityFeed } from "./components/dashboard/RecentActivityFeed";

const EMPTY_MODEL: DashboardModel = {
  isMultiProperty: false,
  properties: [],
  propertySummaries: [],
  activeIssues: [],
  recentActivity: [],
  totals: {
    properties: 0,
    openIssues: 0,
    totalIssues: 0,
    mediaCount: 0,
    evidenceLinkCount: 0,
  },
};

export default function Dashboard() {
  const profileId = useProfileId();
  const { plan, ready, error } = useSubscriptionPlan(profileId);
  const { canCreate, limitReached } = usePropertyCreationLimit();
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1);
    window.addEventListener("storage", bump);
    window.addEventListener(AUTH_CHANGED_EVENT, bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(AUTH_CHANGED_EVENT, bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const model = useMemo(() => {
    if (!profileId) return EMPTY_MODEL;
    if (!plan) return null;
    return buildDashboardModel(plan);
  }, [plan, profileId, dataVersion]);

  if (!ready) {
    return (
      <p className="my-home-text-muted" role="status">
        Loading dashboard…
      </p>
    );
  }

  if (error || (profileId && !plan)) {
    return (
      <p className="my-home-form-error" role="alert">
        Could not load your subscription plan. Refresh the page or try again.
      </p>
    );
  }

  if (!model) {
    return (
      <p className="my-home-text-muted" role="status">
        Loading dashboard…
      </p>
    );
  }

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">Dashboard</h1>
          <p className="my-home-subtitle">
            {model.isMultiProperty
              ? "Overview across all your properties"
              : "Overview for your property"}
          </p>
        </div>
        <AddPropertyButton />
      </header>

      {model.properties.length === 0 && canCreate && !limitReached ? (
        <p className="my-home-text-muted" style={{ marginBottom: 20 }}>
          <Link href="/my-home/properties/new">Add your property</Link> to get
          started.
        </p>
      ) : null}

      <div className="my-home-dashboard-layout">
        <PropertySummarySection model={model} />

        <div className="my-home-dashboard-columns">
          <ActiveIssuesPreview issues={model.activeIssues} />
          <RecentActivityFeed activities={model.recentActivity} />
        </div>
      </div>
    </>
  );
}
