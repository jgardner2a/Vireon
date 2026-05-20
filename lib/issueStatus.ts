export const ISSUE_STATUSES = ["Open", "In Progress", "Resolved"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const DEFAULT_ISSUE_STATUS: IssueStatus = "Open";

export function normalizeIssueStatus(status?: string): IssueStatus {
  if (status && ISSUE_STATUSES.includes(status as IssueStatus)) {
    return status as IssueStatus;
  }
  return DEFAULT_ISSUE_STATUS;
}
