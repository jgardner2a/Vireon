import { getAuthEmail } from "./authSession";
import { getCurrentVireonUser } from "./authUsers";
import {
  canCreateProperty,
  FREE_PLAN_PROPERTY_LIMIT,
  maxPropertiesForPlan,
} from "./permissions";
import {
  getSubscriptionPlan,
  type UserPlan,
} from "./subscription/subscription";
import {
  PROPERTY_RESIDENCE_CURRENT,
  PROPERTY_RESIDENCE_PREVIOUS,
  type PropertyResidenceStatus,
} from "./property/residenceStatus";
import { ensureUnsortedFolderForProperty } from "./galleryFoldersStore";
import { syncLeasesWithProperties } from "./leasesStore";
import { dataCache } from "./data/cache";
import { cacheCreatedProperty } from "./data/repos";
import { countPropertiesForProfile } from "./data/propertyCount";
import { getProfileId, resolveProfileId } from "./data/profile";

export type { PropertyResidenceStatus };

export type Property = {
  id: string;
  name: string;
  address: string;
  /** Persistent DB field `properties.residence_status` — not UI selection. */
  residenceStatus: PropertyResidenceStatus;
};

export const PROPERTY_LIMIT_REACHED_CODE = "PROPERTY_LIMIT_REACHED" as const;

export type PropertyLimitStatus = {
  count: number;
  max: number;
  remaining: number;
  canAdd: boolean;
};

export function getCurrentProperty(): Property | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    dataCache.properties.find(
      (p) => p.residenceStatus === PROPERTY_RESIDENCE_CURRENT
    ) ?? dataCache.properties[0]
  );
}

export function getPreviousProperties(): Property[] {
  if (typeof window === "undefined") return [];
  return dataCache.properties.filter(
    (p) => p.residenceStatus === PROPERTY_RESIDENCE_PREVIOUS
  );
}

export function getPropertyLimitStatus(
  plan: UserPlan,
  count: number
): PropertyLimitStatus {
  const max = maxPropertiesForPlan(plan);
  const remaining = Number.isFinite(max)
    ? Math.max(0, max - count)
    : Number.POSITIVE_INFINITY;
  return {
    count,
    max,
    remaining,
    canAdd: canCreateProperty(plan, count),
  };
}

export function formatPropertyLimitLabel(status: PropertyLimitStatus): string {
  if (!Number.isFinite(status.max)) {
    return `${status.count} properties`;
  }
  return `${status.count} / ${status.max} ${status.max === 1 ? "property" : "properties"}`;
}

export function propertyLimitReachedMessage(status: PropertyLimitStatus): string {
  if (!Number.isFinite(status.max)) {
    return "Upgrade to Pro to add more properties and rental history.";
  }
  return `You've reached your property limit (${formatPropertyLimitLabel(status)}). Upgrade to Pro for rental history.`;
}

export const PROPERTY_LIMIT_MESSAGE = `Free accounts can add up to ${FREE_PLAN_PROPERTY_LIMIT} current home. Upgrade to Pro for rental history.`;

export const PROPERTY_LIMIT_UPGRADE_HINT =
  "Free plan includes one current home. Upgrade to add previous rentals.";

async function resolveProfileIdForCurrentUser(): Promise<string | null> {
  if (!getAuthEmail()) return null;
  return getProfileId() ?? (await resolveProfileId());
}

async function loadPropertyLimitInputs(
  profileId: string
): Promise<{ plan: UserPlan; count: number } | null> {
  try {
    const [count, plan] = await Promise.all([
      countPropertiesForProfile(profileId),
      getSubscriptionPlan(profileId),
    ]);
    if (count === null) return null;
    return { plan, count };
  } catch {
    return null;
  }
}

/** Live plan + property count from Supabase only. */
export async function getCurrentUserPropertyLimitStatus(): Promise<PropertyLimitStatus | null> {
  const profileId = await resolveProfileIdForCurrentUser();
  if (!profileId) return null;

  const inputs = await loadPropertyLimitInputs(profileId);
  if (!inputs) return null;

  return getPropertyLimitStatus(inputs.plan, inputs.count);
}

export function listProperties(): Property[] {
  if (typeof window === "undefined") return [];
  const current = getCurrentProperty();
  const previous = getPreviousProperties();
  return current ? [current, ...previous] : [...previous];
}

/** Re-counts properties in Supabase (not cache). */
export async function syncCurrentUserPropertiesCount(): Promise<number | null> {
  const profileId = await resolveProfileIdForCurrentUser();
  if (!profileId) return null;
  return countPropertiesForProfile(profileId);
}

export type CreatePropertyInput = {
  name: string;
  address: string;
};

export type CreatePropertyResult =
  | { ok: true; property: Property }
  | {
      ok: false;
      code:
        | typeof PROPERTY_LIMIT_REACHED_CODE
        | "NOT_AUTHENTICATED"
        | "INVALID_INPUT"
        | "PERSIST_FAILED";
      message: string;
      upgradeRequired?: boolean;
    };

export type SetCurrentPropertyResult =
  | { ok: true; property: Property }
  | {
      ok: false;
      code: "NOT_AUTHENTICATED" | "UPGRADE_REQUIRED" | "PERSIST_FAILED";
      message: string;
      upgradeRequired?: boolean;
    };

function applyCurrentPropertyToCache(property: Property): void {
  for (const row of dataCache.properties) {
    row.residenceStatus =
      row.id === property.id
        ? PROPERTY_RESIDENCE_CURRENT
        : PROPERTY_RESIDENCE_PREVIOUS;
  }
}

/** Server-authoritative switch of CURRENT home (Pro). */
export async function setCurrentProperty(
  propertyId: string
): Promise<SetCurrentPropertyResult> {
  const email = getAuthEmail();
  if (!email) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "You must be signed in.",
    };
  }

  const response = await fetch("/api/properties/current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, propertyId }),
  });

  if (response.status === 403) {
    return {
      ok: false,
      code: "UPGRADE_REQUIRED",
      message: "Upgrade to Pro to switch your current home.",
      upgradeRequired: true,
    };
  }

  if (!response.ok) {
    let payload: { message?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: payload.message ?? "Could not update current property.",
    };
  }

  const payload = (await response.json()) as {
    property?: Property;
  };

  if (!payload.property?.id) {
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: "Could not update current property.",
    };
  }

  applyCurrentPropertyToCache(payload.property);
  return { ok: true, property: payload.property };
}

export async function createProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  const name = input.name.trim();
  const address = input.address.trim();

  if (!name || !address) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Name and address are required.",
    };
  }

  const user = getCurrentVireonUser();
  if (!user) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "You must be signed in to add a property.",
    };
  }

  const profileId = await resolveProfileIdForCurrentUser();
  if (!profileId) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "Could not verify your account. Sign in again and retry.",
    };
  }

  let inputs: { plan: UserPlan; count: number };
  try {
    const count = await countPropertiesForProfile(profileId);
    if (count === null) {
      return {
        ok: false,
        code: "NOT_AUTHENTICATED",
        message: "Could not load your account from the server. Try again.",
      };
    }
    const plan = await getSubscriptionPlan(profileId);
    inputs = { plan, count };
  } catch {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "Could not load your subscription plan. Try again.",
    };
  }

  const limitStatus = getPropertyLimitStatus(inputs.plan, inputs.count);

  if (!canCreateProperty(inputs.plan, inputs.count)) {
    return {
      ok: false,
      code: PROPERTY_LIMIT_REACHED_CODE,
      message: propertyLimitReachedMessage(limitStatus),
      upgradeRequired: true,
    };
  }

  const response = await fetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      name,
      address,
    }),
  });

  if (response.status === 403) {
    let payload: { error?: string; upgradeRequired?: boolean } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    if (payload.error === "property_limit_reached") {
      const fresh = await loadPropertyLimitInputs(profileId);
      const status = fresh
        ? getPropertyLimitStatus(fresh.plan, fresh.count)
        : limitStatus;
      return {
        ok: false,
        code: PROPERTY_LIMIT_REACHED_CODE,
        message: propertyLimitReachedMessage(status),
        upgradeRequired: payload.upgradeRequired === true,
      };
    }
  }

  if (!response.ok) {
    let payload: { message?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    if (response.status === 401) {
      return {
        ok: false,
        code: "NOT_AUTHENTICATED",
        message: payload.message ?? "Could not verify your account.",
      };
    }
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message:
        payload.message ??
        "Could not save the property. Check your connection and try again.",
    };
  }

  const payload = (await response.json()) as {
    property?: Property;
  };

  if (!payload.property?.id) {
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: "Could not save the property. Check your connection and try again.",
    };
  }

  const property = payload.property;
  cacheCreatedProperty(property);

  await syncLeasesWithProperties();
  await ensureUnsortedFolderForProperty(property.id);

  return { ok: true, property };
}
