import {
  getCachedCurrentHomeId,
  getCachedUserId,
  invalidateHomeCache,
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

/** Validate user_state pointer against the user's homes list (invalid → null). */
export function resolveDashboardHome(
  homes: Home[],
  pointerHomeId: string | null
): { currentHomeId: string | null; currentHome: Home | null } {
  const id = pointerHomeId?.trim() ?? "";
  if (!id) {
    return { currentHomeId: null, currentHome: null };
  }

  const currentHome = homes.find((home) => home.id === id) ?? null;
  if (!currentHome) {
    return { currentHomeId: null, currentHome: null };
  }

  return { currentHomeId: id, currentHome };
}

async function clearInvalidCurrentHomePointer(userId: string): Promise<void> {
  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      current_home_id: null,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[dashboard] clear invalid current_home_id", error);
    return;
  }

  invalidateHomeCache();
}

/**
 * Resolve active home for UI; clears stale user_state.current_home_id in DB when invalid.
 */
export async function reconcileDashboardHome(
  userId: string,
  homes: Home[],
  pointerHomeId: string | null
): Promise<{ currentHomeId: string | null; currentHome: Home | null }> {
  const id = pointerHomeId?.trim() ?? "";
  if (id && !homes.some((home) => home.id === id)) {
    await clearInvalidCurrentHomePointer(userId);
  }

  return resolveDashboardHome(homes, pointerHomeId);
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
  const { currentHomeId: resolvedHomeId, currentHome } =
    await reconcileDashboardHome(userId, homes, currentHomeId);

  return {
    userId,
    homes,
    currentHomeId: resolvedHomeId,
    currentHome,
  };
}
