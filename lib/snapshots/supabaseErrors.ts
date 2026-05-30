export type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function logSnapshotsSupabase(
  context: string,
  error: SupabaseErrorLike | null
): void {
  if (!error) {
    return;
  }

  console.error(`[snapshots] ${context}`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    errorJson: JSON.stringify(error),
  });
}

export function formatSnapshotsErrorMessage(
  error: SupabaseErrorLike | null,
  fallback: string
): string {
  if (!error) {
    return fallback;
  }

  const code = error.code ?? "";
  const message = error.message ?? "";

  if (
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  ) {
    return (
      "Snapshots tables are not exposed to the API. In Supabase, create " +
      "snapshots, snapshot_images, and snapshot_issues, then enable API access " +
      "for each table (Settings → API, or the table’s API grant)."
    );
  }

  if (code === "42501" || message.toLowerCase().includes("permission denied")) {
    return "Permission denied loading snapshots. Check row-level security policies for your user.";
  }

  const parts = [message, code, error.details, error.hint].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : fallback;
}
