import { supabase } from "@/lib/supabaseClient";

/** Auth user id from JWT only (auth.uid() aligned). No cached-session fallback. */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
