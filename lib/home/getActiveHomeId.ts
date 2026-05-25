import { supabase } from "@/lib/supabaseClient";

/** Reads user_state.current_home_id for the given user. No other home resolution. */
export async function getActiveHomeId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_state")
    .select("current_home_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[home] fetch user_state", error);
    return null;
  }

  return data?.current_home_id ?? null;
}
