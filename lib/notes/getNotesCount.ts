import { supabase } from "@/lib/supabaseClient";

export async function getNotesCount(
  userId: string,
  homeId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[notes] count", error);
    return 0;
  }

  return count ?? 0;
}
