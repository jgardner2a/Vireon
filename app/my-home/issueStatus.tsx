import type { CSSProperties } from "react";
import type { IssueStatus } from "@/lib/issueStatus";

export {
  DEFAULT_ISSUE_STATUS,
  ISSUE_STATUSES,
  normalizeIssueStatus,
  type IssueStatus,
} from "@/lib/issueStatus";

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
