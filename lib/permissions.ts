/**
 * Plan limits and feature gates — evaluation only (no I/O).
 *
 * Callers must load tier first:
 *   `const plan = await getSubscriptionPlan(profileId)` from
 *   `@/lib/subscription/subscription`, then pass `plan` into these helpers.
 *
 * Tier checks use the subscription tier layer (`isPro`) only — never compare
 * `plan === "pro"` / `plan === "free"` here.
 */

import { isPro, type UserPlan } from "./subscription/subscription";

export type VaultAccessLevel = "summary" | "full";

/** Max properties on the free plan. */
export const FREE_PLAN_PROPERTY_LIMIT = 1;

/** Pro tier property cap (unlimited). */
export const PRO_PLAN_PROPERTY_LIMIT = Number.POSITIVE_INFINITY;

/** Max issues per property on the free plan. */
export const FREE_PLAN_ISSUES_PER_PROPERTY = 4;

/** Max gallery items per property on the free plan. */
export const FREE_PLAN_GALLERY_PER_PROPERTY = 10;

/** Max gallery items per property on the pro plan. */
export const PRO_PLAN_GALLERY_PER_PROPERTY = 100;

/** @deprecated Use per-property gallery limits. */
export const FREE_PLAN_GALLERY_MEDIA_LIMIT = FREE_PLAN_GALLERY_PER_PROPERTY;

export function maxPropertiesForPlan(plan: UserPlan): number {
  return isPro(plan) ? PRO_PLAN_PROPERTY_LIMIT : FREE_PLAN_PROPERTY_LIMIT;
}

export function maxIssuesForProperty(plan: UserPlan): number {
  return isPro(plan) ? Number.POSITIVE_INFINITY : FREE_PLAN_ISSUES_PER_PROPERTY;
}

export function maxGalleryMediaForProperty(plan: UserPlan): number {
  return isPro(plan)
    ? PRO_PLAN_GALLERY_PER_PROPERTY
    : FREE_PLAN_GALLERY_PER_PROPERTY;
}

/**
 * Sole gate for whether another property may be created.
 * Free: allowed while count is below 1. Pro: always allowed.
 */
export function canCreateProperty(
  plan: UserPlan,
  currentPropertyCount: number
): boolean {
  if (isPro(plan)) {
    return true;
  }
  return currentPropertyCount < FREE_PLAN_PROPERTY_LIMIT;
}

export function canCreateIssue(
  plan: UserPlan,
  currentIssueCountForProperty: number
): boolean {
  if (isPro(plan)) {
    return true;
  }
  return currentIssueCountForProperty < FREE_PLAN_ISSUES_PER_PROPERTY;
}

export function canUploadGalleryMedia(
  plan: UserPlan,
  mediaCountForProperty: number
): boolean {
  const max = maxGalleryMediaForProperty(plan);
  if (!Number.isFinite(max)) {
    return true;
  }
  return mediaCountForProperty < max;
}

export function galleryMediaWithinPlanLimit(
  plan: UserPlan,
  totalCountForProperty: number
): boolean {
  const max = maxGalleryMediaForProperty(plan);
  if (!Number.isFinite(max)) {
    return true;
  }
  return totalCountForProperty <= max;
}

export function getVaultAccessLevel(plan: UserPlan): VaultAccessLevel {
  return isPro(plan) ? "full" : "summary";
}

export function hasFullVaultAccess(plan: UserPlan): boolean {
  return getVaultAccessLevel(plan) === "full";
}

/** Pro gallery tier (evaluation only — pass plan from `getSubscriptionPlan`). */
export function hasUnlimitedGalleryUploads(plan: UserPlan): boolean {
  return isPro(plan);
}

/** Dashboard shows portfolio history summaries for Pro; Free sees current home only. */
export function dashboardShowsRentalHistory(plan: UserPlan): boolean {
  return isPro(plan);
}

/** @deprecated Use dashboardShowsRentalHistory */
export function dashboardShowsAllProperties(plan: UserPlan): boolean {
  return dashboardShowsRentalHistory(plan);
}
