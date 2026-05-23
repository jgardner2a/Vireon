/**
 * LEGACY PATH — direct property ownership columns on public.properties.
 *
 * Do not use for new features. Prefer lib/property/membership.ts
 * (property_members.user_id) instead.
 *
 * properties.user_id and properties.profile_id remain during transition.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "../supabaseClient";
import { mapPropertyRow, type Property, type PropertyRow } from "./types";

/**
 * LEGACY: list properties where properties.user_id matches the auth user.
 * Does not consult property_members.
 */
export async function getLegacyPropertiesByUserId(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Property[]> {
  const id = userId.trim();
  if (!id) return [];

  const { data, error } = await client
    .from("properties")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[property/legacy] getLegacyPropertiesByUserId", error);
    return [];
  }

  return (data ?? []).map((row) => mapPropertyRow(row as PropertyRow));
}

/**
 * LEGACY: list properties where properties.profile_id matches (historical tenant key).
 * Does not consult property_members.
 */
export async function getLegacyPropertiesByProfileId(
  profileId: string,
  client: SupabaseClient = supabase
): Promise<Property[]> {
  const id = profileId.trim();
  if (!id) return [];

  const { data, error } = await client
    .from("properties")
    .select("*")
    .eq("profile_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[property/legacy] getLegacyPropertiesByProfileId", error);
    return [];
  }

  return (data ?? []).map((row) => mapPropertyRow(row as PropertyRow));
}

/**
 * LEGACY: current home via properties.residence_status (per profile), not property_members.
 */
export async function getLegacyCurrentPropertyByProfileId(
  profileId: string,
  client: SupabaseClient = supabase
): Promise<Property | null> {
  const id = profileId.trim();
  if (!id) return null;

  const { data, error } = await client
    .from("properties")
    .select("*")
    .eq("profile_id", id)
    .eq("residence_status", "current")
    .maybeSingle();

  if (error) {
    console.error("[property/legacy] getLegacyCurrentPropertyByProfileId", error);
    return null;
  }

  if (!data) return null;
  return mapPropertyRow(data as PropertyRow);
}
