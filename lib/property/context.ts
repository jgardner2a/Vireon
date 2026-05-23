/**
 * My Home property context — membership path only.
 *
 * Current property comes from property_members.is_current via getCurrentProperty().
 * LEGACY: properties.user_id / properties.residence_status are not used here
 * (see lib/property/legacyOwnership.ts during transition).
 */

import type { Property } from "./types";
import {
  fetchUserPropertiesForContext,
  getCurrentProperty,
  setCurrentProperty,
  userBelongsToProperty,
} from "./membership";

/** Dispatched after membership context reload or current-property switch. */
export const PROPERTY_CONTEXT_CHANGED_EVENT = "vireon:property-context-changed";

export function notifyPropertyContextChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROPERTY_CONTEXT_CHANGED_EVENT));
}

export type PropertyContextStatus =
  | "idle"
  | "loading"
  | "error"
  | "empty"
  | "no_current"
  | "ready";

export type PropertyContextSnapshot = {
  status: PropertyContextStatus;
  message?: string;
  currentProperty: Property | null;
  otherProperties: Property[];
  allProperties: Property[];
};

const EMPTY_SNAPSHOT: PropertyContextSnapshot = {
  status: "idle",
  currentProperty: null,
  otherProperties: [],
  allProperties: [],
};

/**
 * Loads membership-scoped property context for My Home.
 * Uses property_members.user_id — never properties.user_id for access.
 */
export async function loadPropertyContextSnapshot(
  userId: string
): Promise<PropertyContextSnapshot> {
  const id = userId.trim();
  if (!id) {
    return {
      ...EMPTY_SNAPSHOT,
      status: "error",
      message: "Not signed in.",
    };
  }

  const { properties, error } = await fetchUserPropertiesForContext(id);
  if (error) {
    return {
      ...EMPTY_SNAPSHOT,
      status: "error",
      message: error,
    };
  }

  if (properties.length === 0) {
    return {
      ...EMPTY_SNAPSHOT,
      status: "empty",
      message: "You are not linked to any properties yet.",
    };
  }

  // Prefer membership flag on hydrated rows; confirm via getCurrentProperty (is_current).
  let currentProperty =
    properties.find((p) => p.membership?.isCurrent === true) ?? null;

  if (!currentProperty) {
    currentProperty = await getCurrentProperty(id);
  }

  if (!currentProperty) {
    return {
      status: "no_current",
      message:
        "No current home is selected. Choose a property below to set your active home.",
      currentProperty: null,
      otherProperties: properties,
      allProperties: properties,
    };
  }

  const otherProperties = properties.filter((p) => p.id !== currentProperty!.id);

  return {
    status: "ready",
    currentProperty,
    otherProperties,
    allProperties: properties,
  };
}

export type SwitchCurrentPropertyResult =
  | { ok: true; snapshot: PropertyContextSnapshot }
  | { ok: false; message: string };

/**
 * Membership path: verify access, switch is_current, return refreshed snapshot.
 */
export async function switchCurrentPropertyForUser(
  userId: string,
  propertyId: string
): Promise<SwitchCurrentPropertyResult> {
  const uid = userId.trim();
  const pid = propertyId.trim();

  if (!uid || !pid) {
    return { ok: false, message: "Missing user or property." };
  }

  const belongs = await userBelongsToProperty(uid, pid);
  if (!belongs) {
    return {
      ok: false,
      message: "You do not have access to that property.",
    };
  }

  const switchResult = await setCurrentProperty(uid, pid);
  if (!switchResult.ok) {
    return { ok: false, message: switchResult.message };
  }

  const snapshot = await loadPropertyContextSnapshot(uid);
  notifyPropertyContextChanged();
  return { ok: true, snapshot };
}
