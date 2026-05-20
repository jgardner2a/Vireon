/**
 * Server-only CURRENT/PREVIOUS property enforcement.
 * Do not import from client stores or UI.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertResidenceStatus,
  PROPERTY_RESIDENCE_CURRENT,
  PROPERTY_RESIDENCE_PREVIOUS,
  type PropertyResidenceStatus,
} from "@/lib/property/residenceStatus";

export type ServerPropertyRow = {
  id: string;
  name: string;
  address: string;
  residence_status: PropertyResidenceStatus;
};

export function createServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, key);
}

export async function countPropertiesForProfileServer(
  supabase: SupabaseClient,
  profileId: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);

  if (error) {
    console.error("[propertyResidence] countProperties", error);
    return null;
  }
  return count ?? 0;
}

export async function getPropertyForProfileServer(
  supabase: SupabaseClient,
  profileId: string,
  propertyId: string
): Promise<ServerPropertyRow | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address, residence_status")
    .eq("profile_id", profileId)
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) return null;
  assertResidenceStatus(data.residence_status);
  return data as ServerPropertyRow;
}

/**
 * Sets exactly one CURRENT property for a profile.
 * Demotes any other CURRENT row to PREVIOUS, then promotes the target.
 */
export async function setCurrentPropertyForProfileServer(
  supabase: SupabaseClient,
  profileId: string,
  propertyId: string
): Promise<{ ok: true; property: ServerPropertyRow } | { ok: false; message: string }> {
  const target = await getPropertyForProfileServer(
    supabase,
    profileId,
    propertyId
  );
  if (!target) {
    return { ok: false, message: "Property not found." };
  }

  if (target.residence_status === PROPERTY_RESIDENCE_CURRENT) {
    return { ok: true, property: target };
  }

  const { error: demoteError } = await supabase
    .from("properties")
    .update({ residence_status: PROPERTY_RESIDENCE_PREVIOUS })
    .eq("profile_id", profileId)
    .eq("residence_status", PROPERTY_RESIDENCE_CURRENT);

  if (demoteError) {
    console.error("[propertyResidence] demote current", demoteError);
    return { ok: false, message: "Could not update residence status." };
  }

  const { data, error: promoteError } = await supabase
    .from("properties")
    .update({ residence_status: PROPERTY_RESIDENCE_CURRENT })
    .eq("profile_id", profileId)
    .eq("id", propertyId)
    .select("id, name, address, residence_status")
    .single();

  if (promoteError || !data) {
    console.error("[propertyResidence] promote current", promoteError);
    return { ok: false, message: "Could not set current property." };
  }

  assertResidenceStatus(data.residence_status);
  return { ok: true, property: data as ServerPropertyRow };
}

/**
 * Creates a property with correct residence_status.
 * First property (or Free tier) is CURRENT; additional Pro properties default to PREVIOUS.
 */
export async function insertPropertyForProfileServer(
  supabase: SupabaseClient,
  profileId: string,
  input: { name: string; address: string },
  options: { isPro: boolean; existingCount: number }
): Promise<ServerPropertyRow | null> {
  const residence_status: PropertyResidenceStatus =
    options.existingCount === 0
      ? PROPERTY_RESIDENCE_CURRENT
      : options.isPro
        ? PROPERTY_RESIDENCE_PREVIOUS
        : PROPERTY_RESIDENCE_CURRENT;

  const { data, error } = await supabase
    .from("properties")
    .insert({
      profile_id: profileId,
      name: input.name,
      address: input.address,
      residence_status,
    })
    .select("id, name, address, residence_status")
    .single();

  if (error || !data) {
    console.error("[propertyResidence] insert property", error);
    return null;
  }

  assertResidenceStatus(data.residence_status);
  return data as ServerPropertyRow;
}
