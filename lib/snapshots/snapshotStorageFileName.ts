/** Storage-safe file names for snapshot uploads (same path convention as gallery). */
export function snapshotStorageFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "image";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
}
