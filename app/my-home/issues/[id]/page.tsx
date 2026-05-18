"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ISSUE_STATUSES,
  IssueStatusBadge,
  normalizeIssueStatus,
  saveIssueStatus,
  type IssueStatus,
} from "../../issueStatus";
import {
  card,
  emptyState,
  field,
  h1,
  label,
  meta,
  page,
  subtitle,
  input,
} from "../../ui";

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState<any>(null);

  useEffect(() => {
    const issues = JSON.parse(localStorage.getItem("issues") || "[]");
    const found = issues.find((i: any) => String(i.id) === String(id));
    if (found) {
      setIssue({ ...found, status: normalizeIssueStatus(found.status) });
    } else {
      setIssue(null);
    }
  }, [id]);

  const handleStatusChange = (status: IssueStatus) => {
    if (!issue) return;
    saveIssueStatus(issue.id, status);
    setIssue({ ...issue, status });
  };

  if (!issue) {
    return (
      <div style={page}>
        <h1 style={h1}>Issue not found</h1>
        <p style={subtitle}>This issue may have been removed.</p>
      </div>
    );
  }

  const status = normalizeIssueStatus(issue.status);

  return (
    <div style={page}>
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1 style={h1}>{issue.title}</h1>
          <IssueStatusBadge status={status} />
        </div>
        <p style={meta}>
          Logged {new Date(issue.createdAt).toLocaleString()}
        </p>
      </header>

      <div style={{ ...card, marginBottom: 24 }}>
        <div style={field}>
          <label style={label} htmlFor="issue-status">
            Status
          </label>
          <select
            id="issue-status"
            className="my-home-input"
            value={status}
            onChange={(e) =>
              handleStatusChange(e.target.value as IssueStatus)
            }
            style={input}
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={card}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.6,
            color: "#475569",
          }}
        >
          {issue.description}
        </p>
      </div>

      {issue.images?.length > 0 ? null : (
        <div style={{ ...emptyState, marginTop: 24 }}>
          No photos attached to this issue yet.
        </div>
      )}
    </div>
  );
}
