"use client";

import Link from "next/link";
import type { DashboardActivity } from "@/lib/insights";

const TYPE_LABELS: Record<DashboardActivity["type"], string> = {
  issue: "Issue",
  media: "Media",
  property: "Property",
};

type RecentActivityFeedProps = {
  activities: DashboardActivity[];
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <section className="my-home-card my-home-dashboard-panel" aria-label="Recent activity">
      <h2 className="my-home-card-title">Recent activity</h2>

      {activities.length === 0 ? (
        <p className="my-home-text-muted">
          No activity yet. Add a property, log an issue, or upload gallery media.
        </p>
      ) : (
        <ul className="my-home-dashboard-activity-list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link href={activity.href} className="my-home-dashboard-activity-item">
                <div className="my-home-row-between">
                  <span
                    className={`my-home-dashboard-activity-type my-home-dashboard-activity-type--${activity.type}`}
                  >
                    {TYPE_LABELS[activity.type]}
                  </span>
                  <time
                    className="my-home-text-muted"
                    dateTime={activity.occurredAt}
                  >
                    {new Date(activity.occurredAt).toLocaleString()}
                  </time>
                </div>
                <p className="my-home-dashboard-activity-item__title">
                  {activity.title}
                </p>
                <p className="my-home-text-muted">{activity.subtitle}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
