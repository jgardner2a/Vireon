/**
 * Aggregate Insights — derivation layer.
 *
 * Computed summaries only. Not source of truth.
 * Places must import from here, not My Home or Evidence.
 */

export {
  buildDashboardModel,
  getDashboardProperties,
  type DashboardActivity,
  type DashboardActivityType,
  type DashboardModel,
  type PropertySummary,
} from "./dashboard";

export {
  buildPlacesInsightsSnapshot,
  type PlacesInsightsSnapshot,
  type PlacesPropertyInsight,
} from "./places";
