"use client";

import type { DashboardModel } from "@/lib/insights";
import { PropertySummaryCard } from "./PropertySummaryCard";

type PropertySummarySectionProps = {
  model: Pick<DashboardModel, "isMultiProperty" | "propertySummaries" | "totals">;
};

export function PropertySummarySection({ model }: PropertySummarySectionProps) {
  const { isMultiProperty, propertySummaries, totals } = model;

  if (propertySummaries.length === 0) {
    return (
      <section className="my-home-card">
        <h2 className="my-home-card-title">Property summary</h2>
        <p className="my-home-body-text">
          No properties yet. Add your first rental location to see dashboard
          insights.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Property summary">
      <div className="my-home-row-between" style={{ marginBottom: 16 }}>
        <h2 className="my-home-section-title" style={{ margin: 0 }}>
          {isMultiProperty ? "Properties" : "Property"}
        </h2>
        {isMultiProperty ? (
          <p className="my-home-text-muted">
            {totals.properties} properties · {totals.openIssues} open issues ·{" "}
            {totals.mediaCount} media
          </p>
        ) : null}
      </div>

      {isMultiProperty ? (
        <div className="my-home-dashboard-property-grid">
          {propertySummaries.map((summary) => (
            <PropertySummaryCard key={summary.property.id} summary={summary} compact />
          ))}
        </div>
      ) : (
        <PropertySummaryCard summary={propertySummaries[0]} />
      )}
    </section>
  );
}
