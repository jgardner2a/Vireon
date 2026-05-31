import {
  EXPORT_ONE_TIME_PRICE_LABEL,
  formatPlanLimitValue,
  formatPlanStorageLimitLabel,
  getPlanDefinition,
  getPlanLimits,
  getPlanStorageLimitBytes,
  isPlanFeatureEnabled,
  type PlanFeature,
} from "@/lib/billing/planConfig";
import {
  planExportBlockedMessage,
  planFeatureLockedMessage,
  planMaxEvidenceLogsMessage,
  planMaxHomesMessage,
  planMaxImagesPerLogMessage,
  planMaxSnapshotImagesPerRoomMessage,
  planStorageLimitMessage,
  planUsageQueryFailedMessage,
} from "@/lib/billing/planCopy";
import { getUserPlanTier, getUserProfile } from "@/lib/billing/getUserProfile";
import type { ExportEligibility, PlanTier } from "@/lib/billing/types";
import { supabase } from "@/lib/supabaseClient";

export type PlanLimitResult = { ok: true } | { ok: false; message: string };

export type BillingQueryResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

const EVIDENCE_LOG_TABLES = [
  "maintenance_logs",
  "complex_issues",
  "apartment_communications",
  "notes",
] as const;

function billingQueryFailure(
  context: string,
  error: { message?: string }
): BillingQueryResult<never> {
  console.error(context, error);
  return { ok: false, message: planUsageQueryFailedMessage() };
}

export async function getGalleryStorageBytesUsed(
  userId: string
): Promise<BillingQueryResult<number>> {
  const { data, error } = await supabase
    .from("gallery")
    .select("file_size")
    .eq("user_id", userId);

  if (error) {
    return billingQueryFailure("[billing] sum gallery storage", error);
  }

  const value = (data ?? []).reduce(
    (total, row) => total + Math.max(0, Number(row.file_size) || 0),
    0
  );

  return { ok: true, value };
}

export async function getDocumentStorageBytesUsed(
  userId: string
): Promise<BillingQueryResult<number>> {
  const { data: homes, error: homesError } = await supabase
    .from("homes")
    .select("id")
    .eq("user_id", userId);

  if (homesError) {
    return billingQueryFailure(
      "[billing] fetch homes for document storage",
      homesError
    );
  }

  const homeIds = (homes ?? []).map((home) => home.id);
  if (homeIds.length === 0) {
    return { ok: true, value: 0 };
  }

  const { data, error } = await supabase
    .from("documents")
    .select("file_size")
    .in("home_id", homeIds);

  if (error) {
    return billingQueryFailure("[billing] sum document storage", error);
  }

  const value = (data ?? []).reduce(
    (total, row) => total + Math.max(0, Number(row.file_size) || 0),
    0
  );

  return { ok: true, value };
}

export async function getUserStorageBytesUsed(
  userId: string,
  plan: PlanTier = "free"
): Promise<BillingQueryResult<number>> {
  const galleryResult = await getGalleryStorageBytesUsed(userId);
  if (!galleryResult.ok) {
    return galleryResult;
  }

  const { storageIncludesDocumentsBucket } = getPlanLimits(plan);
  if (!storageIncludesDocumentsBucket) {
    return { ok: true, value: galleryResult.value };
  }

  const documentResult = await getDocumentStorageBytesUsed(userId);
  if (!documentResult.ok) {
    return documentResult;
  }

  return { ok: true, value: galleryResult.value + documentResult.value };
}

export async function countEvidenceLogsForHome(
  userId: string,
  homeId: string
): Promise<BillingQueryResult<number>> {
  let total = 0;

  for (const table of EVIDENCE_LOG_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("home_id", homeId);

    if (error) {
      return billingQueryFailure(`[billing] count ${table}`, error);
    }

    total += count ?? 0;
  }

  return { ok: true, value: total };
}

export async function countHomesForUser(
  userId: string
): Promise<BillingQueryResult<number>> {
  const { count, error } = await supabase
    .from("homes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    return billingQueryFailure("[billing] count homes", error);
  }

  return { ok: true, value: count ?? 0 };
}

export async function countAttachmentsForLog(
  userId: string,
  homeId: string,
  ownerType: string,
  ownerId: string
): Promise<BillingQueryResult<number>> {
  const { count, error } = await supabase
    .from("attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId);

  if (error) {
    return billingQueryFailure("[billing] count attachments", error);
  }

  return { ok: true, value: count ?? 0 };
}

function normalizeSnapshotRoomKey(room: string | undefined): string | null {
  if (room === undefined) {
    return null;
  }

  const trimmed = room.trim();
  return trimmed ? trimmed : null;
}

export async function countSnapshotImagesForRoom(
  snapshotId: string,
  room: string | undefined
): Promise<BillingQueryResult<number>> {
  const roomValue = normalizeSnapshotRoomKey(room);
  let query = supabase
    .from("snapshot_images")
    .select("*", { count: "exact", head: true })
    .eq("snapshot_id", snapshotId);

  if (roomValue === null) {
    query = query.is("room", null);
  } else {
    query = query.eq("room", roomValue);
  }

  const { count, error } = await query;

  if (error) {
    return billingQueryFailure("[billing] count snapshot_images", error);
  }

  return { ok: true, value: count ?? 0 };
}

export async function assertCanAddSnapshotImages(input: {
  userId: string;
  snapshotId: string;
  room?: string;
  incomingCount: number;
}): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(input.userId);
  const { maxSnapshotImagesPerRoom } = getPlanLimits(plan);
  if (maxSnapshotImagesPerRoom === null) {
    return { ok: true };
  }

  if (input.incomingCount <= 0) {
    return { ok: true };
  }

  const countResult = await countSnapshotImagesForRoom(
    input.snapshotId,
    input.room
  );
  if (!countResult.ok) {
    return { ok: false, message: countResult.message };
  }

  if (countResult.value + input.incomingCount <= maxSnapshotImagesPerRoom) {
    return { ok: true };
  }

  return {
    ok: false,
    message: planMaxSnapshotImagesPerRoomMessage(maxSnapshotImagesPerRoom),
  };
}

export function resolveExportEligibility(input: {
  plan: PlanTier;
  exportCredits: number;
  proIncludedExportUsed: boolean;
}): ExportEligibility {
  if (input.plan === "pro" && !input.proIncludedExportUsed) {
    return { ok: true, source: "pro_included" };
  }

  if (input.exportCredits > 0) {
    return { ok: true, source: "purchase" };
  }

  return { ok: false, message: planExportBlockedMessage() };
}

export async function getExportEligibility(
  userId: string
): Promise<ExportEligibility> {
  const profileResult = await getUserProfile(userId);
  if (!profileResult.ok) {
    return { ok: false, message: profileResult.message };
  }

  return resolveExportEligibility({
    plan: profileResult.profile.plan,
    exportCredits: profileResult.profile.export_credits,
    proIncludedExportUsed: profileResult.profile.pro_included_export_used,
  });
}

export async function assertPlanFeature(
  userId: string,
  feature: PlanFeature
): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(userId);
  if (isPlanFeatureEnabled(plan, feature)) {
    return { ok: true };
  }

  return { ok: false, message: planFeatureLockedMessage(feature) };
}

export async function assertCanCreateHome(userId: string): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(userId);
  const { maxHomes } = getPlanLimits(plan);
  if (maxHomes === null) {
    return { ok: true };
  }

  const countResult = await countHomesForUser(userId);
  if (!countResult.ok) {
    return { ok: false, message: countResult.message };
  }

  if (countResult.value < maxHomes) {
    return { ok: true };
  }

  return { ok: false, message: planMaxHomesMessage(maxHomes) };
}

export async function assertCanCreateEvidenceLog(
  userId: string,
  homeId: string
): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(userId);
  const { maxEvidenceLogsPerHome } = getPlanLimits(plan);
  if (maxEvidenceLogsPerHome === null) {
    return { ok: true };
  }

  const countResult = await countEvidenceLogsForHome(userId, homeId);
  if (!countResult.ok) {
    return { ok: false, message: countResult.message };
  }

  if (countResult.value < maxEvidenceLogsPerHome) {
    return { ok: true };
  }

  return {
    ok: false,
    message: planMaxEvidenceLogsMessage(maxEvidenceLogsPerHome),
  };
}

export async function assertCanAttachLogImages(input: {
  userId: string;
  homeId: string;
  ownerType: string;
  ownerId: string;
  incomingCount: number;
}): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(input.userId);
  const { maxImagesPerLog } = getPlanLimits(plan);
  if (maxImagesPerLog === null) {
    return { ok: true };
  }

  if (input.incomingCount <= 0) {
    return { ok: true };
  }

  const countResult = await countAttachmentsForLog(
    input.userId,
    input.homeId,
    input.ownerType,
    input.ownerId
  );
  if (!countResult.ok) {
    return { ok: false, message: countResult.message };
  }

  if (countResult.value + input.incomingCount <= maxImagesPerLog) {
    return { ok: true };
  }

  return {
    ok: false,
    message: planMaxImagesPerLogMessage(maxImagesPerLog),
  };
}

export async function assertCanUploadStorageBytes(
  userId: string,
  incomingBytes: number
): Promise<PlanLimitResult> {
  if (incomingBytes <= 0) {
    return { ok: true };
  }

  const plan = await getUserPlanTier(userId);
  const limitBytes = getPlanStorageLimitBytes(plan);
  const usageResult = await getUserStorageBytesUsed(userId, plan);
  if (!usageResult.ok) {
    return { ok: false, message: usageResult.message };
  }

  if (usageResult.value + incomingBytes <= limitBytes) {
    return { ok: true };
  }

  return { ok: false, message: planStorageLimitMessage() };
}

/** Pro only: documents bucket counts toward the shared storage cap. Free skips this check. */
export async function assertCanUploadDocumentBytes(input: {
  userId: string;
  incomingBytes: number;
  replaceBytes?: number;
}): Promise<PlanLimitResult> {
  const plan = await getUserPlanTier(input.userId);
  const limits = getPlanLimits(plan);
  if (!limits.storageIncludesDocumentsBucket) {
    return { ok: true };
  }

  if (input.incomingBytes <= 0) {
    return { ok: true };
  }

  const replaceBytes = Math.max(0, input.replaceBytes ?? 0);
  const usageResult = await getUserStorageBytesUsed(input.userId, plan);
  if (!usageResult.ok) {
    return { ok: false, message: usageResult.message };
  }

  const projected = usageResult.value - replaceBytes + input.incomingBytes;

  if (projected <= limits.storageLimitBytes) {
    return { ok: true };
  }

  return { ok: false, message: planStorageLimitMessage() };
}

export async function assertCanExportEvidencePackage(
  userId: string
): Promise<ExportEligibility> {
  return getExportEligibility(userId);
}

export function getPlanSummaryLines(plan: PlanTier): string[] {
  const definition = getPlanDefinition(plan);
  const { limits } = definition;

  return [
    `${formatPlanLimitValue(limits.maxHomes)} ${
      limits.maxHomes === 1 ? "property" : "properties"
    }`,
    `${formatPlanStorageLimitLabel(plan)}`,
    `${formatPlanLimitValue(limits.maxEvidenceLogsPerHome)} evidence logs per property`,
    `${formatPlanLimitValue(limits.maxImagesPerLog)} images per log`,
    definition.features.snapshots
      ? limits.maxSnapshotImagesPerRoom === null
        ? "Full Snapshots"
        : `${limits.maxSnapshotImagesPerRoom} snapshot images per room`
      : "Snapshots locked",
    definition.features.vault ? "Full Vault" : "Vault locked",
    definition.features.insights ? "Full Insights" : "Insights locked",
    plan === "pro"
      ? `${limits.includedExportsPerYear} Evidence Package export per year`
      : `Evidence export via one-time purchase (${EXPORT_ONE_TIME_PRICE_LABEL}) or Pro`,
  ];
}
