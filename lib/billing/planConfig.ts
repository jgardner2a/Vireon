import type { PlanTier } from "@/lib/billing/types";

export type PlanFeature =
  | "snapshots"
  | "vault"
  | "insights"
  | "evidenceExport";

export type PlanLimits = {
  maxHomes: number | null;
  storageLimitBytes: number;
  /** When true, My Home documents bucket counts toward storageLimitBytes. */
  storageIncludesDocumentsBucket: boolean;
  maxEvidenceLogsPerHome: number | null;
  maxImagesPerLog: number | null;
  maxSnapshotImagesPerRoom: number | null;
  includedExportsPerYear: number;
};

export type PlanDefinition = {
  displayName: string;
  description: string;
  priceLabel: string | null;
  limits: PlanLimits;
  features: Record<PlanFeature, boolean>;
};

export const EXPORT_ONE_TIME_PRICE_LABEL = "$29";
export const PRO_ANNUAL_PRICE_LABEL = "$69/year";

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    displayName: "Free",
    description:
      "One property with core evidence logs, limited storage, and locked premium modules.",
    priceLabel: null,
    limits: {
      maxHomes: 1,
      storageLimitBytes: 100 * 1024 * 1024,
      storageIncludesDocumentsBucket: false,
      maxEvidenceLogsPerHome: 5,
      maxImagesPerLog: 2,
      maxSnapshotImagesPerRoom: null,
      includedExportsPerYear: 0,
    },
    features: {
      snapshots: false,
      vault: false,
      insights: false,
      evidenceExport: false,
    },
  },
  pro: {
    displayName: "Pro",
    description:
      "Unlimited properties, full Snapshots, Vault, Insights, and one Evidence Package export per year.",
    priceLabel: PRO_ANNUAL_PRICE_LABEL,
    limits: {
      maxHomes: null,
      storageLimitBytes: 1 * 1024 * 1024 * 1024,
      storageIncludesDocumentsBucket: true,
      maxEvidenceLogsPerHome: null,
      maxImagesPerLog: null,
      maxSnapshotImagesPerRoom: 10,
      includedExportsPerYear: 1,
    },
    features: {
      snapshots: true,
      vault: true,
      insights: true,
      evidenceExport: true,
    },
  },
};

export function getPlanDefinition(plan: PlanTier): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_DEFINITIONS[plan].limits;
}

/** False when the plan allows only one property (no history / switching UI). */
export function planSupportsPropertyHistory(plan: PlanTier): boolean {
  return getPlanLimits(plan).maxHomes !== 1;
}

export function getPlanStorageLimitBytes(plan: PlanTier): number {
  return PLAN_DEFINITIONS[plan].limits.storageLimitBytes;
}

export function isPlanFeatureEnabled(
  plan: PlanTier,
  feature: PlanFeature
): boolean {
  return PLAN_DEFINITIONS[plan].features[feature];
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatStorageBytes(bytes: number): string {
  const normalized = Math.max(0, bytes);
  if (normalized === 0) {
    return "0 B";
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(normalized) / Math.log(1024)),
    BYTE_UNITS.length - 1
  );
  const value = normalized / 1024 ** unitIndex;
  const decimals = unitIndex === 0 ? 0 : value >= 10 ? 0 : 1;

  return `${value.toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`;
}

export function getStorageUsagePercent(
  usedBytes: number,
  limitBytes: number
): number {
  if (limitBytes <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((usedBytes / limitBytes) * 100));
}

export function formatPlanLimitValue(value: number | null): string {
  return value === null ? "Unlimited" : String(value);
}

export function formatPlanStorageLimitLabel(plan: PlanTier): string {
  const { storageLimitBytes, storageIncludesDocumentsBucket } =
    getPlanLimits(plan);
  const sizeLabel = formatStorageBytes(storageLimitBytes);
  return storageIncludesDocumentsBucket
    ? `${sizeLabel} storage (uploads + documents)`
    : `${sizeLabel} uploads storage (documents excluded)`;
}
