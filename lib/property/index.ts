/**
 * Property access layer.
 *
 * - membership.ts — NEW: property_members.user_id (source of truth)
 * - legacyOwnership.ts — LEGACY: properties.user_id / profile_id
 * - types.ts — shared models
 */

export type { Property, PropertyMember, PropertyMemberRow, PropertyRow } from "./types";
export {
  mapPropertyMemberRow,
  mapPropertyRow,
} from "./types";

export {
  getUserProperties,
  getCurrentProperty,
  setCurrentProperty,
  userBelongsToProperty,
  getUserPropertyMemberships,
  fetchUserPropertiesForContext,
} from "./membership";

export {
  loadPropertyContextSnapshot,
  switchCurrentPropertyForUser,
  notifyPropertyContextChanged,
  PROPERTY_CONTEXT_CHANGED_EVENT,
  type PropertyContextSnapshot,
  type PropertyContextStatus,
  type SwitchCurrentPropertyResult,
} from "./context";

export {
  getLegacyPropertiesByUserId,
  getLegacyPropertiesByProfileId,
  getLegacyCurrentPropertyByProfileId,
} from "./legacyOwnership";
