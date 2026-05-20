"use client";

import Link from "next/link";
import type { PropertySummary } from "@/lib/insights";

type PropertySummaryCardProps = {
  summary: PropertySummary;
  compact?: boolean;
};

export function PropertySummaryCard({
  summary,
  compact = false,
}: PropertySummaryCardProps) {
  const { property } = summary;

  return (
    <article className={`my-home-dashboard-property-card${compact ? " my-home-dashboard-property-card--compact" : ""}`}>
      <div className="my-home-dashboard-property-card__header">
        <div>
          <h3 className="my-home-dashboard-property-card__name">
            <Link href={`/my-home/properties/${property.id}`}>
              {property.name}
            </Link>
          </h3>
          <p className="my-home-text-muted">{property.address}</p>
        </div>
        <Link
          href={`/my-home/properties/${property.id}`}
          className="my-home-dashboard-property-card__link"
        >
          View
        </Link>
      </div>

      <dl className="my-home-dashboard-property-card__stats">
        <div>
          <dt>Open issues</dt>
          <dd>{summary.openIssues}</dd>
        </div>
        <div>
          <dt>In progress</dt>
          <dd>{summary.inProgressIssues}</dd>
        </div>
        <div>
          <dt>Total issues</dt>
          <dd>{summary.totalIssues}</dd>
        </div>
        <div>
          <dt>Gallery media</dt>
          <dd>{summary.mediaCount}</dd>
        </div>
      </dl>
    </article>
  );
}
