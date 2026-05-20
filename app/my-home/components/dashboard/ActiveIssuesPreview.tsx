"use client";

import Link from "next/link";
import { IssueStatusBadge } from "../../issueStatus";
import { getPropertyForIssue, type Issue } from "@/lib/issuesStore";

type ActiveIssuesPreviewProps = {
  issues: Issue[];
};

export function ActiveIssuesPreview({ issues }: ActiveIssuesPreviewProps) {
  return (
    <section className="my-home-card my-home-dashboard-panel" aria-label="Active issues">
      <div className="my-home-row-between" style={{ marginBottom: 16 }}>
        <h2 className="my-home-card-title" style={{ margin: 0 }}>
          Active issues
        </h2>
        <Link href="/my-home/issues" className="my-home-dashboard-property-card__link">
          View all
        </Link>
      </div>

      {issues.length === 0 ? (
        <p className="my-home-text-muted">
          No open or in-progress issues.{" "}
          <Link href="/my-home/issues/new">Log an issue</Link>.
        </p>
      ) : (
        <ul className="my-home-dashboard-issue-list">
          {issues.map((issue) => {
            const property = getPropertyForIssue(issue);
            return (
              <li key={issue.id}>
                <Link
                  href={`/my-home/issues/${issue.id}`}
                  className="my-home-dashboard-issue-item"
                >
                  <div className="my-home-row-between">
                    <span className="my-home-dashboard-issue-item__title">
                      {issue.title}
                    </span>
                    <IssueStatusBadge status={issue.status} />
                  </div>
                  <p className="my-home-text-muted">
                    {property?.name ?? "Unknown property"} ·{" "}
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
