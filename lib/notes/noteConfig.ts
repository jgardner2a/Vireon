export const NOTE_CATEGORIES = [
  "General",
  "Maintenance Context",
  "Landlord",
  "Inspection",
  "Other",
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const DEFAULT_NOTE_CATEGORY: NoteCategory = "General";

export function normalizeNoteCategory(value: string): NoteCategory {
  const trimmed = value.trim();
  if (
    NOTE_CATEGORIES.includes(trimmed as NoteCategory)
  ) {
    return trimmed as NoteCategory;
  }
  return DEFAULT_NOTE_CATEGORY;
}
