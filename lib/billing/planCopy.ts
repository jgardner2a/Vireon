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
  return `Please limit ${maxImages} snapshot images per room.`;
}

export function planStorageLimitMessage(): string {
  return "You have reached your plan storage limit. Delete files or upgrade to Pro for more storage.";
}

export function planUsageQueryFailedMessage(): string {
  return "Could not verify plan usage. Try again in a moment.";
}

export function planExportBlockedMessage(): string {
  return `Evidence Package export requires Pro (${PRO_ANNUAL_PRICE_LABEL}, includes 1 export per year) or a one-time purchase (${EXPORT_ONE_TIME_PRICE_LABEL}).`;
}

/** True when a user-facing string is a billing/plan limit (not a generic failure). */
export function isPlanLimitMessage(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }

  return (
    text.startsWith("Free includes") ||
    text.startsWith("Your plan allows") ||
    text.startsWith("You have reached your plan storage limit") ||
    text.startsWith("Please limit") ||
    text.startsWith("Pro includes up to") ||
    text.includes(" is available on Pro") ||
    text.startsWith("Evidence Package export requires") ||
    text.startsWith("No included Pro export available") ||
    text.startsWith("No export credits available") ||
    text.startsWith("Upgrade to Pro")
  );
}
