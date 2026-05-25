const MESSAGE_PREVIEW_LENGTH = 140;

export function formatCommunicationDate(iso: string): string {
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

export function previewMessage(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MESSAGE_PREVIEW_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MESSAGE_PREVIEW_LENGTH).trimEnd()}…`;
}
