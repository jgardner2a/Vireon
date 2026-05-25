export const ALLOWED_CATEGORIES = [
  "Other",
  "General",
  "Maintenance Context",
  "Landlord",
  "Inspection",
] as const;

export type NoteCategory = (typeof ALLOWED_CATEGORIES)[number];

/** @deprecated Use ALLOWED_CATEGORIES */
export const NOTE_CATEGORIES = ALLOWED_CATEGORIES;

export const DEFAULT_NOTE_CATEGORY: NoteCategory = "General";

export function normalizeCategory(
  category: string | null | undefined
): NoteCategory {
  if (category && ALLOWED_CATEGORIES.includes(category as NoteCategory)) {
    return category as NoteCategory;
  }
  return "General";
}

/** @deprecated Use normalizeCategory */
export function normalizeNoteCategory(value: string): NoteCategory {
  return normalizeCategory(value);
}
