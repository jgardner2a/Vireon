export type SnapshotType = "move_in" | "move_out";

export type SnapshotSeverity = "low" | "medium" | "high";

export type Snapshot = {
  id: string;
  home_id: string;
  type: SnapshotType;
  created_at: string;
};

export type SnapshotImage = {
  id: string;
  snapshot_id: string;
  gallery_id: string;
  room: string | null;
  order_index: number | null;
  created_at: string;
};

export type SnapshotIssue = {
  id: string;
  snapshot_id: string;
  label: string;
  room: string | null;
  notes: string | null;
  severity: SnapshotSeverity | null;
  created_at: string;
};

export type SnapshotWithDetails = Snapshot & {
  images: SnapshotImage[];
  issues: SnapshotIssue[];
};

export type AddSnapshotIssuePayload = {
  label: string;
  room?: string;
  notes?: string;
  severity?: SnapshotSeverity;
};
