import { mapHomeRow, type Home, type HomeRow } from "@/lib/home/homeMapper";
import { supabase } from "@/lib/supabaseClient";

export type HomeOwnershipResult =
  | { ok: true; home: Home }
  | { ok: false; message: string };

/** Ensures the home row belongs to the signed-in user before any destructive action. */
export async function assertHomeOwnedByUser(
  userId: string,
  homeId: string
): Promise<HomeOwnershipResult> {
  const normalizedUserId = userId.trim();
  const normalizedHomeId = homeId.trim();

  if (!normalizedUserId || !normalizedHomeId) {
    return { ok: false, message: "Property not found or access denied." };
  }

  const { data, error } = await supabase
    .from("homes")
    .select("id, user_id, name, address, apartment_number, city, state, zip, created_at")
    .eq("id", normalizedHomeId)
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    console.error("[home] assert ownership", error);
    return {
      ok: false,
      message: error.message || "Could not verify property ownership.",
    };
  }

  if (!data) {
    return { ok: false, message: "Property not found or access denied." };
  }

  return { ok: true, home: mapHomeRow(data as HomeRow) };
}
