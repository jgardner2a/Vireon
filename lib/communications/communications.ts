import { cleanupAttachmentsAfterLogDelete } from "@/lib/attachments/logDeleteAttachmentCleanup";
import { invalidateDashboardSnapshot } from "@/lib/dashboard/dashboardSnapshotCache";
import {
  DEFAULT_COMMUNICATION_CATEGORY,
  normalizeCommunicationCategory,
} from "@/lib/communications/communicationConfig";
import type {
  Communication,
  CreateCommunicationInput,
  UpdateCommunicationInput,
} from "@/lib/communications/types";
import { supabase } from "@/lib/supabaseClient";

const COMMUNICATION_COLUMNS =
  "id, user_id, home_id, title, category, message, status, created_at, updated_at";

type CommunicationRow = {
  id: string;
  user_id: string;
  home_id: string;
  title: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function logCommunicationsSupabase(
  context: string,
  payload: { data?: unknown; error?: SupabaseErrorLike | null }
): void {
  const { data, error } = payload;
  console.error(`[communications] ${context}`, {
    data,
    error: error
      ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      : null,
    errorJson: error ? JSON.stringify(error) : null,
  });
}

function formatSupabaseErrorMessage(
  error: SupabaseErrorLike | null,
  fallback: string
): string {
  if (!error) {
    return fallback;
  }

  const parts = [error.message, error.code, error.details, error.hint].filter(
    Boolean
  );

  return parts.length > 0 ? parts.join(" — ") : fallback;
}

async function resolveAuthenticatedUserId(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    logCommunicationsSupabase("auth getUser", { error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(error, "Could not verify session."),
    };
  }

  const userId = data.user?.id?.trim();
  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  return { ok: true, userId };
}

function mapRow(row: CommunicationRow): Communication {
  return {
    id: row.id,
    user_id: row.user_id,
    home_id: row.home_id,
    title: row.title,
    category: row.category,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchCommunications(
  userId: string,
  homeId: string
): Promise<
  { ok: true; communications: Communication[] } | { ok: false; message: string }
> {
  const auth = await resolveAuthenticatedUserId();
  if (!auth.ok) {
    return auth;
  }

  const queryUserId = auth.userId;
  if (userId !== queryUserId) {
    console.warn("[communications] fetch userId mismatch; using session user", {
      passedUserId: userId,
      sessionUserId: queryUserId,
    });
  }

  const { data, error } = await supabase
    .from("apartment_communications")
    .select(COMMUNICATION_COLUMNS)
    .eq("user_id", queryUserId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    logCommunicationsSupabase("fetch", { data, error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(
        error,
        "Could not load communications."
      ),
    };
  }

  return {
    ok: true,
    communications: (data ?? []).map((row) =>
      mapRow(row as CommunicationRow)
    ),
  };
}

export async function createCommunication(
  input: CreateCommunicationInput
): Promise<
  { ok: true; communication: Communication } | { ok: false; message: string }
> {
  const auth = await resolveAuthenticatedUserId();
  if (!auth.ok) {
    return auth;
  }

  const title = input.title.trim();
  const message = input.message.trim();

  if (!title) {
    return { ok: false, message: "Please add a title." };
  }

  if (!message) {
    return { ok: false, message: "Please add a message." };
  }

  const { data, error } = await supabase
    .from("apartment_communications")
    .insert({
      user_id: auth.userId,
      home_id: input.homeId,
      title,
      category: normalizeCommunicationCategory(
        input.category || DEFAULT_COMMUNICATION_CATEGORY
      ),
      message,
      status: input.status,
    })
    .select(COMMUNICATION_COLUMNS)
    .single();

  if (error || !data) {
    logCommunicationsSupabase("insert", { data, error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(
        error,
        "Could not log communication."
      ),
    };
  }

  const communication = mapRow(data as CommunicationRow);
  invalidateDashboardSnapshot(communication.user_id, communication.home_id);
  return { ok: true, communication };
}

export async function updateCommunication(
  input: UpdateCommunicationInput
): Promise<
  { ok: true; communication: Communication } | { ok: false; message: string }
> {
  const auth = await resolveAuthenticatedUserId();
  if (!auth.ok) {
    return auth;
  }

  const title = input.title.trim();
  const message = input.message.trim();

  if (!title) {
    return { ok: false, message: "Please add a title." };
  }

  if (!message) {
    return { ok: false, message: "Please add a message." };
  }

  const { data, error } = await supabase
    .from("apartment_communications")
    .update({
      title,
      category: normalizeCommunicationCategory(
        input.category || DEFAULT_COMMUNICATION_CATEGORY
      ),
      message,
      status: input.status,
    })
    .eq("id", input.id)
    .eq("user_id", auth.userId)
    .select(COMMUNICATION_COLUMNS)
    .single();

  if (error || !data) {
    logCommunicationsSupabase("update", { data, error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(
        error,
        "Could not update communication."
      ),
    };
  }

  return { ok: true, communication: mapRow(data as CommunicationRow) };
}

export async function updateCommunicationStatus(
  id: string,
  userId: string,
  status: string
): Promise<
  { ok: true; communication: Communication } | { ok: false; message: string }
> {
  const auth = await resolveAuthenticatedUserId();
  if (!auth.ok) {
    return auth;
  }

  if (userId !== auth.userId) {
    console.warn(
      "[communications] update status userId mismatch; using session user",
      { passedUserId: userId, sessionUserId: auth.userId }
    );
  }

  const { data, error } = await supabase
    .from("apartment_communications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select(COMMUNICATION_COLUMNS)
    .single();

  if (error || !data) {
    logCommunicationsSupabase("update status", { data, error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(error, "Could not update status."),
    };
  }

  return { ok: true, communication: mapRow(data as CommunicationRow) };
}

export async function deleteCommunication(
  id: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await resolveAuthenticatedUserId();
  if (!auth.ok) {
    return auth;
  }

  if (userId !== auth.userId) {
    console.warn(
      "[communications] delete userId mismatch; using session user",
      { passedUserId: userId, sessionUserId: auth.userId }
    );
  }

  const queryUserId = auth.userId;

  const { data: communicationRow } = await supabase
    .from("apartment_communications")
    .select("home_id")
    .eq("id", id)
    .eq("user_id", queryUserId)
    .maybeSingle();

  const { data: attachmentRows, error: fetchAttachmentsError } = await supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("owner_type", "communication")
    .eq("owner_id", id)
    .eq("user_id", queryUserId);

  if (fetchAttachmentsError) {
    logCommunicationsSupabase("delete fetch attachments", {
      error: fetchAttachmentsError,
    });
  }

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    storage_path: String((row as { storage_path: string }).storage_path ?? ""),
  }));

  const { error } = await supabase
    .from("apartment_communications")
    .delete()
    .eq("id", id)
    .eq("user_id", queryUserId);

  if (error) {
    logCommunicationsSupabase("delete", { error });
    return {
      ok: false,
      message: formatSupabaseErrorMessage(
        error,
        "Could not delete communication."
      ),
    };
  }

  await cleanupAttachmentsAfterLogDelete("communication", attachments);

  const homeId =
    communicationRow && typeof communicationRow.home_id === "string"
      ? communicationRow.home_id
      : undefined;
  invalidateDashboardSnapshot(queryUserId, homeId);

  return { ok: true };
}
