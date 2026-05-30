/**
 * Snapshot records, issues, and gallery linking (no upload — see uploadSnapshotImage.ts).
 */
import type { SnapshotImageRow } from "@/lib/snapshots/snapshotImageRow";
import {
  mapSnapshotImageRow,
  SNAPSHOT_IMAGE_COLUMNS,
} from "@/lib/snapshots/snapshotImageRow";
import type {
  AddSnapshotIssuePayload,
  Snapshot,
  SnapshotImage,
  SnapshotIssue,
  SnapshotType,
  SnapshotWithDetails,
} from "@/lib/snapshots/types";
import {
  formatSnapshotsErrorMessage,
  logSnapshotsSupabase,
} from "@/lib/snapshots/supabaseErrors";
import { getCachedUserId } from "@/lib/sessionCache";
import { supabase } from "@/lib/supabaseClient";

type SnapshotRow = {
  id: string;
  home_id: string;
  type: string;
  created_at: string;
};

type SnapshotIssueRow = {
  id: string;
  snapshot_id: string;
  label: string;
  room: string | null;
  notes: string | null;
  severity: string | null;
  created_at: string;
};

const SNAPSHOT_COLUMNS = "id, home_id, type, created_at";
const SNAPSHOT_ISSUE_COLUMNS =
  "id, snapshot_id, label, room, notes, severity, created_at";

function isSnapshotType(value: string): value is SnapshotType {
  return value === "move_in" || value === "move_out";
}

function mapSnapshotRow(row: SnapshotRow): Snapshot | null {
  if (!isSnapshotType(row.type)) {
    return null;
  }

  return {
    id: row.id,
    home_id: row.home_id,
    type: row.type,
    created_at: row.created_at,
  };
}

function mapSnapshotIssueRow(row: SnapshotIssueRow): SnapshotIssue {
  const severity = row.severity;
  const normalizedSeverity =
    severity === "low" || severity === "medium" || severity === "high"
      ? severity
      : null;

  return {
    id: row.id,
    snapshot_id: row.snapshot_id,
    label: row.label,
    room: row.room,
    notes: row.notes,
    severity: normalizedSeverity,
    created_at: row.created_at,
  };
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createSnapshot(
  homeId: string,
  type: SnapshotType
): Promise<{ ok: true; snapshot: Snapshot } | { ok: false; message: string }> {
  const userId = await getCachedUserId();
  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  const { data, error } = await supabase
    .from("snapshots")
    .insert({
      home_id: homeId,
      type,
    })
    .select(SNAPSHOT_COLUMNS)
    .single();

  if (error || !data) {
    logSnapshotsSupabase("create", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(error, "Could not create snapshot."),
    };
  }

  const snapshot = mapSnapshotRow(data as SnapshotRow);
  if (!snapshot) {
    return { ok: false, message: "Could not create snapshot." };
  }

  return { ok: true, snapshot };
}

export async function getSnapshots(
  homeId: string
): Promise<
  { ok: true; snapshots: Snapshot[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    logSnapshotsSupabase("list", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(error, "Could not load snapshots."),
    };
  }

  const snapshots = (data ?? [])
    .map((row) => mapSnapshotRow(row as SnapshotRow))
    .filter((row): row is Snapshot => row !== null);

  return { ok: true, snapshots };
}

async function fetchSnapshotImages(
  snapshotId: string
): Promise<
  { ok: true; images: SnapshotImage[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("snapshot_images")
    .select(SNAPSHOT_IMAGE_COLUMNS)
    .eq("snapshot_id", snapshotId)
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    logSnapshotsSupabase("fetch images", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        error,
        "Could not load snapshot images."
      ),
    };
  }

  return {
    ok: true,
    images: (data ?? []).map((row) =>
      mapSnapshotImageRow(row as SnapshotImageRow)
    ),
  };
}

async function fetchSnapshotIssues(
  snapshotId: string
): Promise<
  { ok: true; issues: SnapshotIssue[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("snapshot_issues")
    .select(SNAPSHOT_ISSUE_COLUMNS)
    .eq("snapshot_id", snapshotId)
    .order("created_at", { ascending: true });

  if (error) {
    logSnapshotsSupabase("fetch issues", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        error,
        "Could not load snapshot issues."
      ),
    };
  }

  return {
    ok: true,
    issues: (data ?? []).map((row) =>
      mapSnapshotIssueRow(row as SnapshotIssueRow)
    ),
  };
}

export async function getSnapshot(
  snapshotId: string
): Promise<
  { ok: true; snapshot: SnapshotWithDetails } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", snapshotId)
    .maybeSingle();

  if (error) {
    logSnapshotsSupabase("get", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(error, "Could not load snapshot."),
    };
  }

  if (!data) {
    return { ok: false, message: "Snapshot not found." };
  }

  const snapshot = mapSnapshotRow(data as SnapshotRow);
  if (!snapshot) {
    return { ok: false, message: "Could not load snapshot." };
  }

  const [imagesResult, issuesResult] = await Promise.all([
    fetchSnapshotImages(snapshotId),
    fetchSnapshotIssues(snapshotId),
  ]);

  if (!imagesResult.ok) {
    return imagesResult;
  }

  if (!issuesResult.ok) {
    return issuesResult;
  }

  return {
    ok: true,
    snapshot: {
      ...snapshot,
      images: imagesResult.images,
      issues: issuesResult.issues,
    },
  };
}

async function fetchNextSnapshotImageOrderIndex(
  snapshotId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("snapshot_images")
    .select("order_index")
    .eq("snapshot_id", snapshotId);

  if (error) {
    logSnapshotsSupabase("fetch order_index", error);
    return 0;
  }

  let max = -1;
  for (const row of data ?? []) {
    const value = (row as { order_index: number | null }).order_index;
    if (typeof value === "number" && value > max) {
      max = value;
    }
  }

  return max + 1;
}

export async function addSnapshotImages(
  snapshotId: string,
  galleryIds: string[],
  room?: string
): Promise<
  { ok: true; images: SnapshotImage[] } | { ok: false; message: string }
> {
  if (galleryIds.length === 0) {
    return { ok: true, images: [] };
  }

  const roomValue = normalizeOptionalText(room);
  let nextOrderIndex = await fetchNextSnapshotImageOrderIndex(snapshotId);
  const rows = galleryIds.map((galleryId) => ({
    snapshot_id: snapshotId,
    gallery_id: galleryId,
    room: roomValue,
    order_index: nextOrderIndex++,
  }));

  const { data, error } = await supabase
    .from("snapshot_images")
    .insert(rows)
    .select(SNAPSHOT_IMAGE_COLUMNS);

  if (error) {
    logSnapshotsSupabase("add images", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        error,
        "Could not link gallery images to snapshot."
      ),
    };
  }

  return {
    ok: true,
    images: (data ?? []).map((row) =>
      mapSnapshotImageRow(row as SnapshotImageRow)
    ),
  };
}

export async function addSnapshotIssue(
  snapshotId: string,
  payload: AddSnapshotIssuePayload
): Promise<
  { ok: true; issue: SnapshotIssue } | { ok: false; message: string }
> {
  const label = payload.label.trim();
  if (!label) {
    return { ok: false, message: "Please add a label." };
  }

  const { data, error } = await supabase
    .from("snapshot_issues")
    .insert({
      snapshot_id: snapshotId,
      label,
      room: normalizeOptionalText(payload.room),
      notes: normalizeOptionalText(payload.notes),
      severity: payload.severity ?? null,
    })
    .select(SNAPSHOT_ISSUE_COLUMNS)
    .single();

  if (error || !data) {
    logSnapshotsSupabase("add issue", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(
        error,
        "Could not add snapshot issue."
      ),
    };
  }

  return { ok: true, issue: mapSnapshotIssueRow(data as SnapshotIssueRow) };
}

export async function deleteSnapshot(
  snapshotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshotId);

  if (error) {
    logSnapshotsSupabase("delete", error);
    return {
      ok: false,
      message: formatSnapshotsErrorMessage(error, "Could not delete snapshot."),
    };
  }

  return { ok: true };
}
