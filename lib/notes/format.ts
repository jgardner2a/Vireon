const CONTENT_PREVIEW_LENGTH = 140;
const TITLE_FALLBACK_LENGTH = 40;

export function formatNoteDate(iso: string): string {
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

export function noteDisplayTitle(title: string | null, content: string): string {
  const trimmedTitle = title?.trim() ?? "";
  if (trimmedTitle) {
    return trimmedTitle;
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length <= TITLE_FALLBACK_LENGTH) {
    return trimmedContent || "Untitled note";
  }

  return `${trimmedContent.slice(0, TITLE_FALLBACK_LENGTH).trimEnd()}…`;
}

export function previewNoteContent(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= CONTENT_PREVIEW_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, CONTENT_PREVIEW_LENGTH).trimEnd()}…`;
}
