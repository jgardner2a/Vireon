import {
  EXPORT_ONE_TIME_PRICE_LABEL,
  PRO_ANNUAL_PRICE_LABEL,
  type PlanFeature,
} from "@/lib/billing/planConfig";

const FEATURE_LABELS: Record<PlanFeature, string> = {
  snapshots: "Move-in/out Snapshots",
  vault: "Vault",
  insights: "Insights",
  evidenceExport: "Evidence Package export",
};

export function planFeatureLockedMessage(feature: PlanFeature): string {
  return `${FEATURE_LABELS[feature]} is available on Pro (${PRO_ANNUAL_PRICE_LABEL}).`;
}

export function planUpgradeHint(): string {
  return `Upgrade to Pro (${PRO_ANNUAL_PRICE_LABEL}) or purchase a one-time Evidence Package export (${EXPORT_ONE_TIME_PRICE_LABEL}).`;
}

export function planMaxHomesMessage(maxHomes: number): string {
  return maxHomes === 1
    ? "Free includes one property. Upgrade to Pro for unlimited properties."
    : `Your plan allows up to ${maxHomes} properties. Upgrade to Pro for unlimited properties.`;
}

export function planMaxEvidenceLogsMessage(maxLogs: number): string {
  return `Free includes up to ${maxLogs} evidence logs per property (Maintenance, Complex, Communications, and Notes combined). Upgrade to Pro for unlimited logs.`;
}

export function planMaxImagesPerLogMessage(maxImages: number): string {
  return `Free includes up to ${maxImages} images per log. Upgrade to Pro for unlimited images.`;
}

export function planMaxSnapshotImagesPerRoomMessage(maxImages: number): string {
  return `Pro includes up to ${maxImages} snapshot images per room. Remove images from this room or choose another room.`;
}

export function planStorageLimitMessage(): string {
  return "You have reached your plan storage limit. Delete files or upgrade to Pro for more storage.";
}

export function planExportBlockedMessage(): string {
  return `Evidence Package export requires Pro (${PRO_ANNUAL_PRICE_LABEL}, includes 1 export per year) or a one-time purchase (${EXPORT_ONE_TIME_PRICE_LABEL}).`;
}
