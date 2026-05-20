"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IssueStatusBadge } from "../issueStatus";
import { getPropertyForIssue, listIssues, type Issue } from "@/lib/issuesStore";
import { IssueEvidencePreviewStrip } from "./IssueEvidencePreviewStrip";

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    setIssues(listIssues());
  }, []);

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">Issues</h1>
          <p className="my-home-subtitle">
            Problems logged across your properties — linked proof appears on
            each card
          </p>
        </div>
        <Link href="/my-home/issues/new" className="my-home-btn-primary">
          + Log issue
        </Link>
      </header>

      <div className="my-home-stack">
        {issues.length === 0 ? (
          <div className="my-home-empty">
            No issues logged yet.{" "}
            <Link href="/my-home/issues/new">Log your first issue</Link>.
          </div>
        ) : (
          issues.map((issue) => {
            const property = getPropertyForIssue(issue);
            return (
              <article
                key={issue.id}
                className="my-home-list-card my-home-issue-list-card"
              >
                <Link
                  href={`/my-home/issues/${issue.id}`}
                  className="my-home-issue-list-card__link"
                >
                  <div className="my-home-row-between">
                    <span className="my-home-list-card-title">
                      {issue.title}
                    </span>
                    <IssueStatusBadge status={issue.status} />
                  </div>
                  <p className="my-home-body-text my-home-issue-list-card__description">
                    {issue.description}
                  </p>
                  <p className="my-home-text-muted" style={{ marginTop: 8 }}>
                    Property:{" "}
                    {property ? property.name : "Unknown property"}
                  </p>
                  <p className="my-home-text-muted">
                    {new Date(issue.createdAt).toLocaleString()}
                  </p>
                </Link>

                <IssueEvidencePreviewStrip
                  issueId={issue.id}
                  propertyId={issue.propertyId}
                />
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
