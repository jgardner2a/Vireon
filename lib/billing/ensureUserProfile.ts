import { getBillingSessionUserId } from "@/lib/billing/billingSession";
import {
  isIgnorableBillingError,
  logBillingError,
} from "@/lib/billing/logBillingError";
import { supabase } from "@/lib/supabaseClient";

/** Creates a Free profile row if missing (fallback when auth trigger has not run yet). */
export async function ensureUserProfile(userId: string): Promise<void> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const sessionUserId = await getBillingSessionUserId();
  if (!sessionUserId) {
    return;
  }

  if (sessionUserId !== normalizedUserId) {
    return;
  }

  const { data, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", normalizedUserId)
    .limit(1);

  if (selectError && !isIgnorableBillingError(selectError)) {
    logBillingError("ensure profile select", selectError);
  }

  if (data?.[0]) {
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: normalizedUserId,
    plan: "free",
  });

  if (!insertError) {
    return;
  }

  // Another request or the auth trigger may have created the row first.
  if (insertError.code === "23505") {
    return;
  }

  logBillingError("ensure profile insert", insertError);
}
