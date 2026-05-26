/** Unique, storage-safe file name (matches gallery upload convention). */
export function safeGalleryFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "image";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
}
