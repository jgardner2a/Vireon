export type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** Pull PostgREST / Supabase fields even when the object stringifies as `{}`. */
export function extractSupabaseError(error: unknown): SupabaseErrorLike {
  if (error === null || error === undefined) {
    return {};
  }

  if (typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as Record<string, unknown>;
  const fromError =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : undefined;

  const message =
    (typeof record.message === "string" && record.message.trim()) ||
    fromError ||
    undefined;

  return {
    message,
    code: typeof record.code === "string" ? record.code : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
  };
}

export function serializeBillingError(error: unknown): Record<string, unknown> {
  const extracted = extractSupabaseError(error);
  let errorJson: string | undefined;

  try {
    errorJson = JSON.stringify(error);
  } catch {
    errorJson = undefined;
  }

  return {
    ...extracted,
    ...(errorJson && errorJson !== "{}" ? { errorJson } : {}),
  };
}

export function isIgnorableBillingError(error: unknown): boolean {
  if (!error) {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  const { message, code, status } = extractSupabaseError(error);
  if (!message && !code) {
    return true;
  }

  if (status === 0 && !message && !code) {
    return true;
  }

  return false;
}

export function hasBillingErrorDetail(error: unknown): boolean {
  if (isIgnorableBillingError(error)) {
    return false;
  }

  const { message, code, details, hint } = extractSupabaseError(error);
  return Boolean(message || code || details || hint);
}

export function logBillingError(label: string, error: unknown): void {
  if (!hasBillingErrorDetail(error)) {
    return;
  }

  console.error(`[billing] ${label}`, serializeBillingError(error));
}

export function isMissingColumnError(error: {
  code?: string;
  message?: string;
}): boolean {
  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST200"
  ) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  if (!message) {
    return false;
  }

  if (message.includes("schema cache") && message.includes("column")) {
    return true;
  }

  return message.includes("column") && message.includes("does not exist");
}

export function isMissingTableError(error: {
  code?: string;
  message?: string;
}): boolean {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function isPermissionDeniedError(error: {
  code?: string;
  message?: string;
}): boolean {
  if (error.code === "42501") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes("permission denied");
}

export function billingErrorMessage(error: {
  message?: string;
  code?: string;
}): string {
  const extracted = extractSupabaseError(error);

  if (isMissingTableError(extracted)) {
    return "Billing profile table is not set up. Run supabase/sql/001_profiles_and_subscriptions.sql in Supabase.";
  }

  if (isPermissionDeniedError(extracted)) {
    return "Profile table permissions are missing. Run supabase/sql/004_profiles_api_grants.sql in Supabase.";
  }

  if (isMissingColumnError(extracted)) {
    return "Billing profile columns are out of date. Run supabase/sql/001_profiles_and_subscriptions.sql and 002_profile_export_entitlements.sql in Supabase.";
  }

  return extracted.message || "Could not load your plan.";
}
