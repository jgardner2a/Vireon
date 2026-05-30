import { waitForBillingSessionUserId } from "@/lib/billing/billingSession";
import { ensureUserProfile } from "@/lib/billing/ensureUserProfile";
import {
  billingErrorMessage,
  hasBillingErrorDetail,
  isIgnorableBillingError,
  logBillingError,
} from "@/lib/billing/logBillingError";
import { isPlanTier, type PlanTier, type UserProfile } from "@/lib/billing/types";
import { supabase } from "@/lib/supabaseClient";

const PROFILE_SELECTS = [
  "id, plan, storage_bytes_used, export_credits, pro_included_export_used, stripe_customer_id, created_at, updated_at",
  "id, plan, storage_bytes_used, stripe_customer_id, created_at, updated_at",
  "id, plan, created_at, updated_at",
  "id, plan",
] as const;

const PROFILE_QUERY_ATTEMPTS = 3;

type ProfileRow = {
  id: string;
  plan: string;
  storage_bytes_used?: number;
  export_credits?: number;
  pro_included_export_used?: boolean;
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type QueryProfileResult =
  | { ok: true; row: ProfileRow }
  | { ok: false; error: unknown; message: string };

const pendingProfileRequests = new Map<string, Promise<GetUserProfileResult>>();
let cachedProfile: { userId: string; profile: UserProfile } | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function invalidateUserProfileCache(): void {
  cachedProfile = null;
}

function coerceProfileRow(value: unknown): ProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const { id, plan } = record;

  if (typeof id !== "string" || typeof plan !== "string") {
    return null;
  }

  return {
    id,
    plan,
    storage_bytes_used:
      typeof record.storage_bytes_used === "number"
        ? record.storage_bytes_used
        : undefined,
    export_credits:
      typeof record.export_credits === "number" ? record.export_credits : undefined,
    pro_included_export_used:
      typeof record.pro_included_export_used === "boolean"
        ? record.pro_included_export_used
        : undefined,
    stripe_customer_id:
      record.stripe_customer_id === null ||
      typeof record.stripe_customer_id === "string"
        ? record.stripe_customer_id
        : undefined,
    created_at:
      typeof record.created_at === "string" ? record.created_at : undefined,
    updated_at:
      typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

function mapProfileRow(row: ProfileRow): UserProfile | null {
  if (!isPlanTier(row.plan)) {
    console.error("[billing] invalid plan on profile", row.plan);
    return null;
  }

  const timestamp = row.updated_at ?? row.created_at ?? new Date().toISOString();

  return {
    id: row.id,
    plan: row.plan,
    storage_bytes_used: Math.max(0, Number(row.storage_bytes_used) || 0),
    export_credits: Math.max(0, Number(row.export_credits) || 0),
    pro_included_export_used: Boolean(row.pro_included_export_used),
    stripe_customer_id: row.stripe_customer_id ?? null,
    created_at: row.created_at ?? timestamp,
    updated_at: timestamp,
  };
}

async function queryProfileRowOnce(userId: string): Promise<QueryProfileResult> {
  let lastSubstantiveError: unknown = null;

  for (let index = 0; index < PROFILE_SELECTS.length; index += 1) {
    const columns = PROFILE_SELECTS[index];
    const isLastSelect = index === PROFILE_SELECTS.length - 1;

    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .limit(1);

    if (!error) {
      const row = coerceProfileRow(data?.[0]);
      if (!row) {
        return { ok: false, error: null, message: "Profile not found." };
      }

      return { ok: true, row };
    }

    if (!isIgnorableBillingError(error)) {
      lastSubstantiveError = error;
    }

    if (!isLastSelect) {
      continue;
    }

    return {
      ok: false,
      error: lastSubstantiveError ?? error,
      message: billingErrorMessage(
        (lastSubstantiveError ?? error) as { message?: string; code?: string }
      ),
    };
  }

  return {
    ok: false,
    error: lastSubstantiveError,
    message: lastSubstantiveError
      ? billingErrorMessage(
          lastSubstantiveError as { message?: string; code?: string }
        )
      : "Could not load your plan.",
  };
}

async function queryProfileRow(userId: string): Promise<QueryProfileResult> {
  let lastResult: QueryProfileResult = {
    ok: false,
    error: null,
    message: "Could not load your plan.",
  };

  for (let attempt = 0; attempt < PROFILE_QUERY_ATTEMPTS; attempt += 1) {
    const result = await queryProfileRowOnce(userId);
    lastResult = result;

    if (result.ok || result.message === "Profile not found.") {
      return result;
    }

    if (attempt < PROFILE_QUERY_ATTEMPTS - 1) {
      await sleep(75 * (attempt + 1));
    }
  }

  return lastResult;
}

export type GetUserProfileResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; message: string };

async function loadUserProfile(
  userId: string,
  expectedUserId?: string | null
): Promise<GetUserProfileResult> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { ok: false, message: "Not signed in." };
  }

  if (cachedProfile?.userId === normalizedUserId) {
    return { ok: true, profile: cachedProfile.profile };
  }

  const sessionUserId =
    expectedUserId?.trim() || (await waitForBillingSessionUserId());
  if (!sessionUserId) {
    return { ok: false, message: "Not signed in." };
  }

  if (sessionUserId !== normalizedUserId) {
    return { ok: false, message: "Not signed in." };
  }

  let result = await queryProfileRow(normalizedUserId);

  if (!result.ok && result.message === "Profile not found.") {
    await ensureUserProfile(normalizedUserId);
    result = await queryProfileRow(normalizedUserId);
  }

  if (!result.ok) {
    if (result.error && hasBillingErrorDetail(result.error)) {
      logBillingError("fetch profile", result.error);
    }
    return { ok: false, message: result.message };
  }

  const profile = mapProfileRow(result.row);
  if (!profile) {
    return { ok: false, message: "Could not load your plan." };
  }

  cachedProfile = { userId: normalizedUserId, profile };
  return { ok: true, profile };
}

export async function getUserProfile(
  userId: string,
  expectedUserId?: string | null
): Promise<GetUserProfileResult> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { ok: false, message: "Not signed in." };
  }

  const pending = pendingProfileRequests.get(normalizedUserId);
  if (pending) {
    return pending;
  }

  const request = loadUserProfile(normalizedUserId, expectedUserId).finally(() => {
    pendingProfileRequests.delete(normalizedUserId);
  });

  pendingProfileRequests.set(normalizedUserId, request);
  return request;
}

export async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const result = await getUserProfile(userId);
  return result.ok ? result.profile.plan : "free";
}
