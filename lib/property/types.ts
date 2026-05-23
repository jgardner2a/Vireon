/**
 * Property + property_members models.
 *
 * New lookups: property_members.user_id (see lib/property/membership.ts).
 * Legacy lookups: properties.user_id / properties.profile_id (see lib/property/legacyOwnership.ts).
 */

/** Row shape for public.property_members */
export type PropertyMemberRow = {
  id: string;
  user_id: string;
  property_id: string;
  is_current: boolean;
  created_at: string;
};

/** Application model for a membership link */
export type PropertyMember = {
  id: string;
  userId: string;
  propertyId: string;
  isCurrent: boolean;
  createdAt: string;
};

/** Row shape for public.properties (includes legacy columns) */
export type PropertyRow = {
  id: string;
  profile_id: string;
  /** LEGACY: direct ownership column — prefer property_members for new code */
  user_id: string | null;
  name: string;
  address: string;
  residence_status?: "current" | "previous" | null;
  created_at: string;
};

/** Property returned from membership joins */
export type Property = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  residenceStatus: "current" | "previous" | null;
  /** LEGACY: properties.user_id when present on the row */
  legacyUserId: string | null;
  /** LEGACY: properties.profile_id */
  legacyProfileId: string;
  /** Membership context when loaded via property_members */
  membership?: Pick<PropertyMember, "id" | "isCurrent">;
};

export function mapPropertyMemberRow(row: PropertyMemberRow): PropertyMember {
  return {
    id: row.id,
    userId: row.user_id,
    propertyId: row.property_id,
    isCurrent: row.is_current,
    createdAt: row.created_at,
  };
}

export function mapPropertyRow(
  row: PropertyRow,
  membership?: PropertyMemberRow | null
): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    residenceStatus: row.residence_status ?? null,
    legacyUserId: row.user_id ?? null,
    legacyProfileId: row.profile_id,
    membership: membership
      ? {
          id: membership.id,
          isCurrent: membership.is_current,
        }
      : undefined,
  };
}
