/**
 * MEMBERSHIP PATH — source of truth for user ↔ property access.
 *
 * All new property lookups must filter on property_members.user_id.
 * Legacy properties.user_id remains on the property row for transition only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "../supabaseClient";
import {
  mapPropertyMemberRow,
  mapPropertyRow,
  type Property,
  type PropertyMember,
  type PropertyMemberRow,
  type PropertyRow,
} from "./types";

type MembershipPropertyJoin = {
  id: string;
  user_id: string;
  property_id: string;
  is_current: boolean;
  created_at: string;
  properties: PropertyRow | PropertyRow[] | null;
};

function propertyFromJoin(row: MembershipPropertyJoin): Property | null {
  const propertyRow = Array.isArray(row.properties)
    ? row.properties[0]
    : row.properties;
  if (!propertyRow) return null;

  const membershipRow: PropertyMemberRow = {
    id: row.id,
    user_id: row.user_id,
    property_id: row.property_id,
    is_current: row.is_current,
    created_at: row.created_at,
  };

  return mapPropertyRow(propertyRow, membershipRow);
}

/**
 * Returns properties for a user via property_members (membership path).
 */
export async function getUserProperties(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Property[]> {
  const id = userId.trim();
  if (!id) return [];

  const { data, error } = await client
    .from("property_members")
    .select(
      `
      id,
      user_id,
      property_id,
      is_current,
      created_at,
      properties:property_id (
        id,
        profile_id,
        user_id,
        name,
        address,
        residence_status,
        created_at
      )
    `
    )
    .eq("user_id", id)
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[property/membership] getUserProperties", error);
    return [];
  }

  return mapMembershipJoinRows(data ?? []);
}

/**
 * Membership path with explicit error surface (for My Home context bootstrap).
 */
export async function fetchUserPropertiesForContext(
  userId: string,
  client: SupabaseClient = supabase
): Promise<{ properties: Property[]; error: string | null }> {
  const id = userId.trim();
  if (!id) {
    return { properties: [], error: "Not signed in." };
  }

  const { data, error } = await client
    .from("property_members")
    .select(
      `
      id,
      user_id,
      property_id,
      is_current,
      created_at,
      properties:property_id (
        id,
        profile_id,
        user_id,
        name,
        address,
        residence_status,
        created_at
      )
    `
    )
    .eq("user_id", id)
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[property/membership] fetchUserPropertiesForContext", error);
    return {
      properties: [],
      error: error.message || "Could not load your properties.",
    };
  }

  return { properties: mapMembershipJoinRows(data ?? []), error: null };
}

function mapMembershipJoinRows(rows: unknown[]): Property[] {
  const properties: Property[] = [];
  for (const row of rows as MembershipPropertyJoin[]) {
    const property = propertyFromJoin(row);
    if (property) properties.push(property);
  }
  return properties;
}

/**
 * Returns the property where property_members.is_current = true for this user.
 */
export async function getCurrentProperty(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Property | null> {
  const id = userId.trim();
  if (!id) return null;

  const { data, error } = await client
    .from("property_members")
    .select(
      `
      id,
      user_id,
      property_id,
      is_current,
      created_at,
      properties:property_id (
        id,
        profile_id,
        user_id,
        name,
        address,
        residence_status,
        created_at
      )
    `
    )
    .eq("user_id", id)
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    console.error("[property/membership] getCurrentProperty", error);
    return null;
  }

  if (!data) return null;

  return propertyFromJoin(data as MembershipPropertyJoin);
}

/**
 * Transactional current-property switch (membership path).
 * Clears is_current for all memberships, then sets the selected one.
 */
export async function setCurrentProperty(
  userId: string,
  propertyId: string,
  client: SupabaseClient = supabase
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = userId.trim();
  const pid = propertyId.trim();
  if (!uid || !pid) {
    return { ok: false, message: "userId and propertyId are required." };
  }

  const belongs = await userBelongsToProperty(uid, pid, client);
  if (!belongs) {
    return {
      ok: false,
      message: "User is not a member of this property.",
    };
  }

  const { error } = await client.rpc("set_current_property_member", {
    p_user_id: uid,
    p_property_id: pid,
  });

  if (error) {
    console.error("[property/membership] setCurrentProperty", error);
    return {
      ok: false,
      message: error.message || "Could not update current property.",
    };
  }

  return { ok: true };
}

/**
 * Membership path: whether property_members links this user to the property.
 */
export async function userBelongsToProperty(
  userId: string,
  propertyId: string,
  client: SupabaseClient = supabase
): Promise<boolean> {
  const uid = userId.trim();
  const pid = propertyId.trim();
  if (!uid || !pid) return false;

  const { data, error } = await client
    .from("property_members")
    .select("id")
    .eq("user_id", uid)
    .eq("property_id", pid)
    .maybeSingle();

  if (error) {
    console.error("[property/membership] userBelongsToProperty", error);
    return false;
  }

  return !!data?.id;
}

/** Lists raw membership rows for a user (membership path). */
export async function getUserPropertyMemberships(
  userId: string,
  client: SupabaseClient = supabase
): Promise<PropertyMember[]> {
  const id = userId.trim();
  if (!id) return [];

  const { data, error } = await client
    .from("property_members")
    .select("*")
    .eq("user_id", id)
    .order("is_current", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[property/membership] getUserPropertyMemberships", error);
    return [];
  }

  return (data ?? []).map((row) => mapPropertyMemberRow(row as PropertyMemberRow));
}
