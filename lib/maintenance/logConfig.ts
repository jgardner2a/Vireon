export const MAINTENANCE_LOG_STATUSES = ["Active", "Resolved"] as const;

export type MaintenanceLogStatus = (typeof MAINTENANCE_LOG_STATUSES)[number];

export type MaintenanceCategoryConfig = {
  category: string;
  types: readonly string[];
};

export const MAINTENANCE_CATEGORIES: readonly MaintenanceCategoryConfig[] = [
  {
    category: "Plumbing",
    types: ["Leak", "No Hot Water", "Clogged Drain", "Running Toilet"],
  },
  {
    category: "Electrical",
    types: ["Outlet Failure", "Flickering Lights", "Power Outage"],
  },
  {
    category: "HVAC",
    types: ["No AC", "No Heat", "Vent Issue"],
  },
  {
    category: "Pest",
    types: ["Roaches", "Mice", "Bed Bugs", "Ants"],
  },
  {
    category: "Safety",
    types: ["Broken Lock", "Smoke Detector", "Security Concern"],
  },
  {
    category: "Appliances",
    types: ["Refrigerator", "Oven", "Dishwasher", "Washer/Dryer"],
  },
  {
    category: "Noise",
    types: ["Neighbors", "Construction", "Street Noise"],
  },
  {
    category: "Lease / Management",
    types: ["Maintenance Delay", "Entry Notice", "Communication Issue"],
  },
  {
    category: "Other",
    types: ["Other"],
  },
] as const;

export function getCategoryNames(): string[] {
  return MAINTENANCE_CATEGORIES.map((entry) => entry.category);
}

export function getIssueTypesForCategory(category: string): string[] {
  const match = MAINTENANCE_CATEGORIES.find(
    (entry) => entry.category === category
  );
  return match ? [...match.types] : [];
}

export function buildMaintenanceLogTitle(
  category: string,
  issueType: string
): string {
  return `${category} - ${issueType}`;
}
