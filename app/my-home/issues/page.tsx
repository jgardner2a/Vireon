"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IssueStatusBadge,
  normalizeIssueStatus,
} from "../issueStatus";
import {
  emptyState,
  h1,
  listCard,
  listCardBody,
  listCardTitle,
  meta,
  page,
  pageHeader,
  pageHeaderStack,
  stack,
  subtitle,
} from "../ui";

export default function Issues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const issuesData = JSON.parse(localStorage.getItem("issues") || "[]");
    const propData = JSON.parse(localStorage.getItem("properties") || "[]");

    setIssues(issuesData);
    setProperties(propData);
  }, []);

  const getPropertyName = (id: string) => {
    return properties.find((p) => p.id == id)?.name || "Unknown property";
  };

  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Issues</h1>
          <p style={subtitle}>Problems logged across your properties</p>
        </div>
        <Link href="/my-home/issues/new" className="my-home-btn-primary">
          + Log issue
        </Link>
      </header>

      <div style={stack}>
        {issues.length === 0 ? (
          <div style={emptyState}>No issues logged yet.</div>
        ) : (
          issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/my-home/issues/${issue.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="my-home-list-card" style={listCard}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={listCardTitle}>{issue.title}</span>
                  <IssueStatusBadge
                    status={normalizeIssueStatus(issue.status)}
                  />
                </div>
                <p style={listCardBody}>{issue.description}</p>
                <p style={meta}>Property: {getPropertyName(issue.propertyId)}</p>
                <p style={meta}>
                  {new Date(issue.createdAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
