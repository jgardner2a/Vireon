import { setAuthSession, getAuthEmail } from "./authSession";
import { normalizeAuthEmail, validateAuthCredentials } from "./authValidation";
import { initializeSavedPlacesForUser } from "./savedPlaces";
import { dataCache } from "./data/cache";
import { supabase } from "./supabaseClient";
import { guardCoreDataWrite } from "./uiState/allowedLocalStorage";

const LEGACY_USERS_KEY = "vireonUsers";

/** Auth-only profile row — tier reads use `getSubscriptionPlan(profileId)`. */
type AuthProfileRow = {
  id: string;
  email: string;
  password_hash: string;
  properties_count: number;
};

/** @deprecated LocalStorage migration payload only — not `VireonUser`. */
export type StoredUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
  plan?: "free" | "pro";
  propertiesCount?: number;
};

/**
 * Signed-in session identity for auth and display — not subscription state.
 * Tier / limits: `getSubscriptionPlan(profileId)` and `countPropertiesForProfile(profileId)`.
 */
export type VireonUser = {
  email: string;
  /** Hydrated property rows in cache — not used for plan limits. */
  propertiesCount: number;
};

function normalizePropertiesCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return 0;
}

/** Builds session user from auth fields only (never includes `plan`). */
export function toVireonUser(row: {
  email: string;
  propertiesCount?: number;
}): VireonUser {
  return {
    email: row.email.trim(),
    propertiesCount: normalizePropertiesCount(row.propertiesCount),
  };
}

function profileToUser(row: AuthProfileRow): VireonUser {
  return toVireonUser({
    email: row.email,
    propertiesCount: row.properties_count,
  });
}

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function findProfile(email: string): Promise<AuthProfileRow | null> {
  const normalized = normalizeAuthEmail(email);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, password_hash, properties_count")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) return null;
  dataCache.profileId = data.id;
  return data as AuthProfileRow;
}

function readLegacyUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LEGACY_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

async function importLegacyUserIfPresent(
  email: string,
  passwordHash: string
): Promise<AuthProfileRow | null> {
  const legacy = readLegacyUsers().find(
    (u) => normalizeAuthEmail(u.email) === normalizeAuthEmail(email)
  );
  if (!legacy) return null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email: normalizeAuthEmail(legacy.email),
      password_hash: legacy.passwordHash,
      // subscription-arch: allow-legacy-plan-seed (one-time DB write from localStorage)
      plan: legacy.plan === "pro" ? "pro" : "free",
      properties_count: normalizePropertiesCount(legacy.propertiesCount),
    })
    .select("id, email, password_hash, properties_count")
    .single();

  if (error || !data) return null;

  localStorage.removeItem(LEGACY_USERS_KEY);
  return data as AuthProfileRow;
}

/** Auth lookup by email — does not load subscription tier. */
export async function getVireonUserByEmail(email: string): Promise<VireonUser | null> {
  const profile = await findProfile(email);
  return profile ? profileToUser(profile) : null;
}

/** Current session user (email + cached property row count). No `plan` field. */
export function getCurrentVireonUser(): VireonUser | null {
  const email = getAuthEmail();
  if (!email || !dataCache.profileId) return null;

  const count = dataCache.properties.length;
  return {
    email: dataCache.profileEmail ?? email,
    propertiesCount: count,
  };
}

export async function setUserPropertiesCount(
  email: string,
  count: number
): Promise<void> {
  if (typeof window === "undefined") return;

  const profile = await findProfile(email);
  if (!profile) return;

  const safeCount = normalizePropertiesCount(count);
  await supabase
    .from("profiles")
    .update({ properties_count: safeCount })
    .eq("id", profile.id);
}

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

export async function signUpUser(
  email: string,
  password: string,
  confirmPassword: string
): Promise<AuthResult> {
  const validation = validateAuthCredentials(email, password, {
    requireConfirm: true,
    confirmPassword,
  });

  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  const existing = await findProfile(validation.email);
  if (existing) {
    return {
      ok: false,
      message: "An account with this email already exists. Log in instead.",
    };
  }

  const passwordHash = await hashPassword(validation.password);
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email: validation.email,
      password_hash: passwordHash,
      plan: "free",
      properties_count: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Could not create your account. Try again in a moment.",
    };
  }

  dataCache.profileId = data.id;
  initializeSavedPlacesForUser(validation.email);
  setAuthSession(validation.email);

  return { ok: true, email: validation.email };
}

export async function signInUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const validation = validateAuthCredentials(email, password);

  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  const passwordHash = await hashPassword(validation.password);
  let profile = await findProfile(validation.email);

  if (!profile) {
    profile = await importLegacyUserIfPresent(validation.email, passwordHash);
  }

  if (!profile) {
    return {
      ok: false,
      message: "No account found for this email. Create an account first.",
    };
  }

  if (passwordHash !== profile.password_hash) {
    return {
      ok: false,
      message: "Incorrect email or password.",
    };
  }

  dataCache.profileId = profile.id;
  initializeSavedPlacesForUser(validation.email);
  setAuthSession(validation.email);

  return { ok: true, email: validation.email };
}

/** Blocks accidental writes to deprecated user storage. */
export function writeLegacyUsersBlocked(): void {
  guardCoreDataWrite(LEGACY_USERS_KEY);
}
