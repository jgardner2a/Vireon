import type { SnapshotImage } from "@/lib/snapshots/types";

export type SnapshotImageRow = {
  id: string;
  snapshot_id: string;
  gallery_id: string;
  room: string | null;
  order_index: number | null;
  created_at: string;
};

export const SNAPSHOT_IMAGE_COLUMNS =
  "id, snapshot_id, gallery_id, room, order_index, created_at";

export function mapSnapshotImageRow(row: SnapshotImageRow): SnapshotImage {
  return {
    id: row.id,
    snapshot_id: row.snapshot_id,
    gallery_id: row.gallery_id,
    room: row.room,
    order_index:
      typeof row.order_index === "number" ? row.order_index : null,
    created_at: row.created_at,
  };
}
