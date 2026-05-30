import {
  getCachedCurrentHomeId,
  getCachedUserId,
  invalidateHomeCache,
} from "@/lib/sessionCache";
import { waitForBillingSessionUserId } from "@/lib/billing/billingSession";
import { getUserProfile } from "@/lib/billing/getUserProfile";
import { getUserStorageBytesUsed } from "@/lib/billing/planEnforcement";
import type { PlanTier } from "@/lib/billing/types";
import { mapHomeRow, type Home, type HomeRow } from "@/lib/home/homeMapper";
import { supabase } from "@/lib/supabaseClient";

export type DashboardState = {
  userId: string;
  plan: PlanTier;
  exportCredits: number;
  proIncludedExportUsed: boolean;
  storageBytesUsed: number;
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

/** Reload plan/export fields without refetching homes (e.g. after export consume). */
export async function reloadDashboardBillingFields(
  userId: string
): Promise<
  Pick<
    DashboardState,
    "plan" | "exportCredits" | "proIncludedExportUsed" | "storageBytesUsed"
  >
> {
  const profileResult = await getUserProfile(userId, userId);
  const plan = profileResult.ok ? profileResult.profile.plan : "free";
  const exportCredits = profileResult.ok
    ? profileResult.profile.export_credits
    : 0;
  const proIncludedExportUsed = profileResult.ok
    ? profileResult.profile.pro_included_export_used
    : false;
  const storageBytesUsed = await getUserStorageBytesUsed(userId, plan);

  return {
    plan,
    exportCredits,
    proIncludedExportUsed,
    storageBytesUsed,
  };
}

/** Coordinated dashboard identity + home resolution for client pages. */
export async function getDashboardState(
  authUserId?: string | null
): Promise<DashboardState | null> {
  const userId =
    authUserId?.trim() || (await waitForBillingSessionUserId());

  if (!userId) {
    return null;
  }

  const [homesResult, currentHomeId, profileResult] = await Promise.all([
    supabase.from("homes").select("*").eq("user_id", userId),
    getCachedCurrentHomeId(userId),
    getUserProfile(userId, userId),
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

  const plan = profileResult.ok ? profileResult.profile.plan : "free";
  const exportCredits = profileResult.ok
    ? profileResult.profile.export_credits
    : 0;
  const proIncludedExportUsed = profileResult.ok
    ? profileResult.profile.pro_included_export_used
    : false;
  const storageBytesUsed = await getUserStorageBytesUsed(userId, plan);

  return {
    userId,
    plan,
    exportCredits,
    proIncludedExportUsed,
    storageBytesUsed,
    homes,
    currentHomeId: resolvedHomeId,
    currentHome,
  };
}
