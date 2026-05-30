import { cleanupAttachmentsAfterLogDelete } from "@/lib/attachments/logDeleteAttachmentCleanup";
import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import { assertCanCreateEvidenceLog } from "@/lib/billing/planEnforcement";
import { buildMaintenanceLogTitle } from "@/lib/maintenance/logConfig";
import type {
  CreateMaintenanceLogInput,
  MaintenanceLog,
  UpdateMaintenanceLogInput,
} from "@/lib/maintenance/types";
import { supabase } from "@/lib/supabaseClient";

type MaintenanceLogRow = {
  id: string;
  user_id: string;
  home_id: string;
  category: string;
  issue_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

function mapRow(row: MaintenanceLogRow): MaintenanceLog {
  return {
    id: row.id,
    user_id: row.user_id,
    home_id: row.home_id,
    category: row.category,
    issue_type: row.issue_type,
    title: row.title,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function fetchMaintenanceLogsForHome(
  userId: string,
  homeId: string
): Promise<
  { ok: true; logs: MaintenanceLog[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[maintenance] fetch", error);
    return {
      ok: false,
      message: error.message || "Could not load maintenance logs.",
    };
  }

  return {
    ok: true,
    logs: (data ?? []).map((row) => mapRow(row as MaintenanceLogRow)),
  };
}

export async function createMaintenanceLog(
  input: CreateMaintenanceLogInput
): Promise<
  { ok: true; log: MaintenanceLog } | { ok: false; message: string }
> {
  const description = input.description.trim();

  if (!description) {
    return { ok: false, message: "Please add a description." };
  }

  const planCheck = await assertCanCreateEvidenceLog(input.userId, input.homeId);
  if (!planCheck.ok) {
    return planCheck;
  }

  const title = buildMaintenanceLogTitle(input.category, input.issueType);

  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert({
      user_id: input.userId,
      home_id: input.homeId,
      category: input.category,
      issue_type: input.issueType,
      title,
      description,
      status: input.status,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[maintenance] insert", error);
    return {
      ok: false,
      message: error?.message || "Could not log maintenance.",
    };
  }

  invalidateDashboardSnapshot(input.userId, input.homeId);
  return { ok: true, log: mapRow(data as MaintenanceLogRow) };
}

export async function updateMaintenanceLog(
  input: UpdateMaintenanceLogInput
): Promise<
  { ok: true; log: MaintenanceLog } | { ok: false; message: string }
> {
  const description = input.description.trim();

  if (!description) {
    return { ok: false, message: "Please add a description." };
  }

  const title = buildMaintenanceLogTitle(input.category, input.issueType);

  const { data, error } = await supabase
    .from("maintenance_logs")
    .update({
      category: input.category,
      issue_type: input.issueType,
      title,
      description,
      status: input.status,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[maintenance] update", error);
    return {
      ok: false,
      message: error?.message || "Could not update maintenance log.",
    };
  }

  const log = mapRow(data as MaintenanceLogRow);
  invalidateDashboardSnapshot(log.user_id, log.home_id);
  return { ok: true, log };
}

export async function updateMaintenanceLogStatus(
  logId: string,
  userId: string,
  status: string
): Promise<
  { ok: true; log: MaintenanceLog } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .update({ status })
    .eq("id", logId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[maintenance] update status", error);
    return {
      ok: false,
      message: error?.message || "Could not update status.",
    };
  }

  const log = mapRow(data as MaintenanceLogRow);
  invalidateDashboardSnapshot(log.user_id, log.home_id);
  return { ok: true, log };
}

export async function deleteMaintenanceLog(
  logId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: attachmentRows, error: fetchAttachmentsError } = await supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("owner_type", "maintenance")
    .eq("owner_id", logId)
    .eq("user_id", userId);

  if (fetchAttachmentsError) {
    console.error("[maintenance] delete fetch attachments", fetchAttachmentsError);
  }

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    storage_path: String((row as { storage_path: string }).storage_path ?? ""),
  }));

  const { error } = await supabase
    .from("maintenance_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.error("[maintenance] delete", error);
    return {
      ok: false,
      message: error.message || "Could not delete maintenance log.",
    };
  }

  await cleanupAttachmentsAfterLogDelete("maintenance", attachments, {
    userId,
    ownerType: "maintenance",
    ownerId: logId,
  });

  invalidateDashboardSnapshot(userId);
  return { ok: true };
}
