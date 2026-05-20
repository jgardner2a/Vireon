import { dataCache } from "./data/cache";

export type IncidentLog = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
  propertyId: string;
};

export function listIncidents(): IncidentLog[] {
  if (typeof window === "undefined") return [];
  return [...dataCache.incidents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function listIncidentsByPropertyId(
  propertyId: number | string
): IncidentLog[] {
  const key = String(propertyId);
  return listIncidents().filter((item) => String(item.propertyId) === key);
}

export function getIncidentById(id: number | string): IncidentLog | null {
  const key = String(id);
  return listIncidents().find((item) => String(item.id) === key) ?? null;
}
