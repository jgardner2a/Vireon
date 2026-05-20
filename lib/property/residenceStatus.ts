/** Persistent residence role — stored on `properties.residence_status`. */
export type PropertyResidenceStatus = "current" | "previous";

export const PROPERTY_RESIDENCE_CURRENT: PropertyResidenceStatus = "current";
export const PROPERTY_RESIDENCE_PREVIOUS: PropertyResidenceStatus = "previous";

export function isCurrentResidence(
  status: PropertyResidenceStatus
): boolean {
  return status === PROPERTY_RESIDENCE_CURRENT;
}

export function assertResidenceStatus(
  value: unknown
): asserts value is PropertyResidenceStatus {
  if (value !== "current" && value !== "previous") {
    throw new Error(`Invalid residence_status: ${String(value)}`);
  }
}
