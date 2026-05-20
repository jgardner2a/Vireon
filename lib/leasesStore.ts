import { listProperties, type Property } from "./propertiesStore";
import { dataCache } from "./data/cache";
import { insertLeaseForProperty } from "./data/repos";

export type Lease = {
  id: string;
  propertyId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
};

/** Ensures each property has a rental lease record for vault cross-linking. */
export async function syncLeasesWithProperties(): Promise<void> {
  if (typeof window === "undefined") return;

  const properties = listProperties();
  const existing = listLeases();
  const byProperty = new Map(
    existing.map((lease) => [String(lease.propertyId), lease])
  );

  for (const property of properties) {
    if (byProperty.has(String(property.id))) continue;
    await insertLeaseForProperty(property);
  }
}

export function listLeases(): Lease[] {
  if (typeof window === "undefined") return [];
  return [...dataCache.leases];
}

export function getLeaseByPropertyId(
  propertyId: number | string
): Lease | null {
  const key = String(propertyId);
  return listLeases().find((lease) => String(lease.propertyId) === key) ?? null;
}

export function getLeaseById(id: number | string): Lease | null {
  const key = String(id);
  return listLeases().find((lease) => String(lease.id) === key) ?? null;
}
