import {
  getCachedCurrentHomeId,
  getCachedUserId,
} from "@/lib/sessionCache";
import { mapHomeRow, type Home, type HomeRow } from "@/lib/home/homeMapper";
import { supabase } from "@/lib/supabaseClient";

export type DashboardState = {
  userId: string;
  homes: Home[];
  currentHomeId: string | null;
  currentHome: Home | null;
};

export class DashboardStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardStateError";
  }
}

/** Coordinated dashboard identity + home resolution for client pages. */
export async function getDashboardState(): Promise<DashboardState | null> {
  const userId = await getCachedUserId();

  if (!userId) {
    return null;
  }

  const [homesResult, currentHomeId] = await Promise.all([
    supabase.from("homes").select("*").eq("user_id", userId),
    getCachedCurrentHomeId(userId),
  ]);

  if (homesResult.error) {
    console.error("[dashboard] fetch homes", homesResult.error);
    throw new DashboardStateError(
      homesResult.error.message || "Could not load homes."
    );
  }

  const rows = (homesResult.data ?? []) as HomeRow[];
  const homes = rows.map(mapHomeRow);
  const currentHome = homes.find((h) => h.id === currentHomeId) ?? null;

  return {
    userId,
    homes,
    currentHomeId,
    currentHome,
  };
}
