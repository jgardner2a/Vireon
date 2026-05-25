// LEGACY ISSUES MODULE - REPLACED BY lib/maintenance/logConfig.ts

export const ISSUE_STATUSES = ["Active", "Resolved"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export type IssueCategoryConfig = {
  category: string;
  types: readonly string[];
};

export const ISSUE_CATEGORIES: readonly IssueCategoryConfig[] = [
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
  return ISSUE_CATEGORIES.map((entry) => entry.category);
}

export function getIssueTypesForCategory(category: string): string[] {
  const match = ISSUE_CATEGORIES.find((entry) => entry.category === category);
  return match ? [...match.types] : [];
}

export function buildIssueTitle(category: string, issueType: string): string {
  return `${category} - ${issueType}`;
}
