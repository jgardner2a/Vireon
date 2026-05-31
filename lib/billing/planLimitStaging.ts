import {
  getPlanLimits,
  getPlanStorageLimitBytes,
} from "@/lib/billing/planConfig";
import {
  planMaxImagesPerLogMessage,
  planMaxSnapshotImagesPerRoomMessage,
  planStorageLimitMessage,
  planUsageQueryFailedMessage,
} from "@/lib/billing/planCopy";
import type { PlanLimitResult } from "@/lib/billing/planEnforcement";
import type { PlanTier } from "@/lib/billing/types";

/** Client-side cap before a log exists or on staged files (no server round-trip). */
export function assertCanStageLogAttachmentFiles(input: {
  plan: PlanTier;
  existingCount: number;
  pendingCount: number;
  incomingCount: number;
}): PlanLimitResult {
  const { maxImagesPerLog } = getPlanLimits(input.plan);
  if (maxImagesPerLog === null || input.incomingCount <= 0) {
    return { ok: true };
  }

  const projectedTotal =
    input.existingCount + input.pendingCount + input.incomingCount;

  if (projectedTotal <= maxImagesPerLog) {
    return { ok: true };
  }

  return {
    ok: false,
    message: planMaxImagesPerLogMessage(maxImagesPerLog),
  };
}

/** Client-side snapshot room cap before uploading a batch. */
export function assertCanStageSnapshotRoomImages(input: {
  plan: PlanTier;
  existingCount: number;
  incomingCount: number;
}): PlanLimitResult {
  const { maxSnapshotImagesPerRoom } = getPlanLimits(input.plan);
  if (maxSnapshotImagesPerRoom === null || input.incomingCount <= 0) {
    return { ok: true };
  }

  if (input.existingCount + input.incomingCount <= maxSnapshotImagesPerRoom) {
    return { ok: true };
  }

  return {
    ok: false,
    message: planMaxSnapshotImagesPerRoomMessage(maxSnapshotImagesPerRoom),
  };
}

/** Client-side storage cap using dashboard-cached usage (approximate before upload). */
export function assertCanStageStorageBytes(input: {
  plan: PlanTier;
  usedBytes: number | null | undefined;
  incomingBytes: number;
}): PlanLimitResult {
  if (input.incomingBytes <= 0) {
    return { ok: true };
  }

  if (input.usedBytes == null) {
    return { ok: false, message: planUsageQueryFailedMessage() };
  }

  const limitBytes = getPlanStorageLimitBytes(input.plan);
  if (input.usedBytes + input.incomingBytes <= limitBytes) {
    return { ok: true };
  }

  return { ok: false, message: planStorageLimitMessage() };
}
