/** UI-only or synthetic ids must never be persisted on evidence links. */
export function isTransientEvidenceEntityId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("__")) return true;
  if (/^(temp|ui|draft|preview)[-:]/i.test(trimmed)) return true;
  return false;
}
