export const COMPLEX_ISSUE_STATUSES = ["Active", "Resolved"] as const;

export type ComplexIssueStatus = (typeof COMPLEX_ISSUE_STATUSES)[number];

export type ComplexCategoryConfig = {
  category: string;
  types: readonly string[];
};

export const COMPLEX_CATEGORIES: readonly ComplexCategoryConfig[] = [
  {
    category: "Cleanliness",
    types: [
      "Hallways",
      "Common areas",
      "Shared laundry",
      "Trash rooms",
      "Restrooms (shared)",
      "Exterior cleanliness",
    ],
  },
  {
    category: "Waste / Trash",
    types: [
      "Missed pickup",
      "Overflowing bins",
      "Improper disposal",
      "Dumpster area condition",
      "Recycling issues",
    ],
  },
  {
    category: "Building Upkeep",
    types: [
      "Elevators",
      "Lighting (common areas)",
      "HVAC (building-wide)",
      "Pest control",
      "Landscaping",
      "General maintenance delays",
    ],
  },
  {
    category: "Noise / Disturbance",
    types: [
      "Hallway noise",
      "Construction noise",
      "Mechanical noise (vents, pipes)",
      "Shared space disruption",
    ],
  },
  {
    category: "Shared Spaces",
    types: [
      "Entryways",
      "Stairwells",
      "Parking garage",
      "Mailroom / package area",
      "Amenities (gym, pool, etc.)",
    ],
  },
  {
    category: "Safety / Security",
    types: [
      "Lighting safety",
      "Door access issues",
      "Camera / surveillance concerns",
      "Package theft risk areas",
      "Unauthorized access points",
    ],
  },
  {
    category: "Utilities",
    types: [
      "Water outages",
      "Hot water inconsistency",
      "Electrical interruptions",
      "Internet / building WiFi issues",
      "Gas system issues",
    ],
  },
  {
    category: "Management / Service Quality",
    types: [
      "Slow response times",
      "Poor communication",
      "Policy enforcement inconsistency",
      "Cleaning staff issues",
      "Contractor reliability",
    ],
  },
  {
    category: "Environment / Habitability",
    types: [
      "Odors (hallways/common areas)",
      "Mold / humidity (shared areas)",
      "Temperature issues",
      "Air quality concerns",
    ],
  },
] as const;

export function getCategoryNames(): string[] {
  return COMPLEX_CATEGORIES.map((entry) => entry.category);
}

export function getIssueTypesForCategory(category: string): string[] {
  const match = COMPLEX_CATEGORIES.find((entry) => entry.category === category);
  return match ? [...match.types] : [];
}

export function buildComplexIssueTitle(
  category: string,
  issueType: string
): string {
  return `${category} - ${issueType}`;
}
