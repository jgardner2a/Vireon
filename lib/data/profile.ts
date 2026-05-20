import { supabase } from "../supabaseClient";
import { getAuthEmail } from "../authSession";
import { dataCache } from "./cache";

/**
 * Resolves profile id and caches id/email only (session convenience).
 * Does NOT cache plan, properties_count, or any subscription/limit fields.
 * Tier: `getSubscriptionPlan(profileId)`. Count: `countPropertiesForProfile(profileId)`.
 */
export async function resolveProfileId(): Promise<string | null> {
  const email = getAuthEmail();
  if (!email) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (error || !data?.id) return null;

  dataCache.profileId = data.id;
  dataCache.profileEmail = data.email;
  return data.id;
}

export function getProfileId(): string | null {
  return dataCache.profileId;
}
