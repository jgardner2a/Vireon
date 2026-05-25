// LEGACY ISSUES MODULE - REPLACED BY lib/maintenance/format.ts

const DESCRIPTION_PREVIEW_LENGTH = 140;

export function formatIssueDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function previewDescription(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;
}
