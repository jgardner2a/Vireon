import { supabase } from "../supabaseClient";

export type UserPlan = "free" | "pro";

/**
 * Reads subscription tier from Supabase only (`profiles.plan`).
 * Do not use cache, localStorage, or in-memory mirrors for plan state.
 */
export async function getSubscriptionPlan(
  profileId: string
): Promise<UserPlan> {
  const id = profileId.trim();
  if (!id) {
    throw new Error("profileId is required to load subscription plan.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription plan: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile not found.");
  }

  assertPlan(data.plan);
  return data.plan === "pro" ? "pro" : "free";
}

export function isPro(plan: UserPlan): boolean {
  return plan === "pro";
}

export function assertPlan(plan: unknown): asserts plan is UserPlan {
  if (plan !== "free" && plan !== "pro") {
    throw new Error(`Invalid subscription plan: ${String(plan)}`);
  }
}
