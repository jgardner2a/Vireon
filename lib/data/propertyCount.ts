import { supabase } from "../supabaseClient";

/**
 * Authoritative property count — always from Supabase, never cache or UI state.
 * Equivalent to: SELECT count(*) FROM properties WHERE profile_id = $1
 */
export async function countPropertiesForProfile(
  profileId: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);

  if (error) {
    console.error("[propertyCount] countPropertiesForProfile", error);
    return null;
  }

  return count ?? 0;
}
