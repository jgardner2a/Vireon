import {
  EXPORT_ONE_TIME_PRICE_LABEL,
  formatPlanLimitValue,
  formatStorageBytes,
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
} from "@/lib/billing/planCopy";
import { getUserPlanTier, getUserProfile } from "@/lib/billing/getUserProfile";
import type { ExportEligibility, PlanTier } from "@/lib/billing/types";
import { supabase } from "@/lib/supabaseClient";

export type PlanLimitResult = { ok: true } | { ok: false; message: string };

const EVIDENCE_LOG_TABLES = [
  "maintenance_logs",
  "complex_issues",
  "apartment_communications",
  "notes",
] as const;

export async function getGalleryStorageBytesUsed(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("gallery")
    .select("file_size")
    .eq("user_id", userId);

  if (error) {
    console.error("[billing] sum gallery storage", error);
    return 0;
  }

  return (data ?? []).reduce(
    (total, row) => total + Math.max(0, Number(row.file_size) || 0),
    0
  );
}

export async function getDocumentStorageBytesUsed(userId: string): Promise<number> {
  const { data: homes, error: homesError } = await supabase
    .from("homes")
    .select("id")
    .eq("user_id", userId);

  if (homesError) {
    console.error("[billing] fetch homes for document storage", homesError);
    return 0;
  }

  const homeIds = (homes ?? []).map((home) => home.id);
  if (homeIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from("documents")
    .select("file_size")
    .in("home_id", homeIds);

  if (error) {
    console.error("[billing] sum document storage", error);
    return 0;
  }

  return (data ?? []).reduce(
    (total, row) => total + Math.max(0, Number(row.file_size) || 0),
    0
  );
}

export async function getUserStorageBytesUsed(
  userId: string,
  plan: PlanTier = "free"
): Promise<number> {
  const galleryBytes = await getGalleryStorageBytesUsed(userId);
  const { storageIncludesDocumentsBucket } = getPlanLimits(plan);

  if (!storageIncludesDocumentsBucket) {
    return galleryBytes;
  }

  const documentBytes = await getDocumentStorageBytesUsed(userId);
  return galleryBytes + documentBytes;
}

export async function countEvidenceLogsForHome(
  userId: string,
  homeId: string
): Promise<number> {
  let total = 0;

  for (const table of EVIDENCE_LOG_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("home_id", homeId);

    if (error) {
      console.error(`[billing] count ${table}`, error);
      continue;
    }

    total += count ?? 0;
  }

  return total;
}

export async function countHomesForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("homes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[billing] count homes", error);
    return 0;
  }

  return count ?? 0;
}

export async function countAttachmentsForLog(
  userId: string,
  homeId: string,
  ownerType: string,
  ownerId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId);

  if (error) {
    console.error("[billing] count attachments", error);
    return 0;
  }

  return count ?? 0;
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
): Promise<number> {
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
    console.error("[billing] count snapshot_images", error);
    return 0;
  }

  return count ?? 0;
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

  const existingCount = await countSnapshotImagesForRoom(
    input.snapshotId,
    input.room
  );

  if (existingCount + input.incomingCount <= maxSnapshotImagesPerRoom) {
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

  const homeCount = await countHomesForUser(userId);
  if (homeCount < maxHomes) {
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

  const logCount = await countEvidenceLogsForHome(userId, homeId);
  if (logCount < maxEvidenceLogsPerHome) {
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

  const existingCount = await countAttachmentsForLog(
    input.userId,
    input.homeId,
    input.ownerType,
    input.ownerId
  );

  if (existingCount + input.incomingCount <= maxImagesPerLog) {
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
  const usedBytes = await getUserStorageBytesUsed(userId, plan);

  if (usedBytes + incomingBytes <= limitBytes) {
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
  const usedBytes = await getUserStorageBytesUsed(input.userId, plan);
  const projected = usedBytes - replaceBytes + input.incomingBytes;

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
