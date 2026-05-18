import type { CSSProperties } from "react";

export const ISSUE_STATUSES = ["Open", "In Progress", "Resolved"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const DEFAULT_ISSUE_STATUS: IssueStatus = "Open";

export function normalizeIssueStatus(status?: string): IssueStatus {
  if (status && ISSUE_STATUSES.includes(status as IssueStatus)) {
    return status as IssueStatus;
  }
  return DEFAULT_ISSUE_STATUS;
}

const statusColors: Record<
  IssueStatus,
  { bg: string; text: string; border: string }
> = {
  Open: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "In Progress": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Resolved: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

export function issueStatusBadgeStyle(status: IssueStatus): CSSProperties {
  const c = statusColors[status];
  return {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
    color: c.text,
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <span style={issueStatusBadgeStyle(status)}>{status}</span>;
}

export function saveIssueStatus(
  issueId: string | number,
  status: IssueStatus
): void {
  const issues = JSON.parse(localStorage.getItem("issues") || "[]");
  const updated = issues.map((issue: { id: string | number; status?: string }) =>
    String(issue.id) === String(issueId) ? { ...issue, status } : issue
  );
  localStorage.setItem("issues", JSON.stringify(updated));
}
