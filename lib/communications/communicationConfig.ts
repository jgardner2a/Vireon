export const COMMUNICATION_STATUSES = ["Open", "Resolved", "Escalated"] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

export const COMMUNICATION_CATEGORIES = [
  "Repair Request",
  "Response Received",
  "No Response",
  "Follow-up",
  "Lease Question",
  "Payment Discussion",
  "Notice Sent",
  "Other",
] as const;

export type CommunicationCategory = (typeof COMMUNICATION_CATEGORIES)[number];

export const DEFAULT_COMMUNICATION_CATEGORY: CommunicationCategory = "Other";

export function normalizeCommunicationCategory(
  value: string | null | undefined
): CommunicationCategory {
  if (
    value &&
    COMMUNICATION_CATEGORIES.includes(value as CommunicationCategory)
  ) {
    return value as CommunicationCategory;
  }
  return DEFAULT_COMMUNICATION_CATEGORY;
}

export function normalizeCommunicationStatus(
  value: string
): CommunicationStatus {
  if (COMMUNICATION_STATUSES.includes(value as CommunicationStatus)) {
    return value as CommunicationStatus;
  }
  return "Open";
}
