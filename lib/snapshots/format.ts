import type { SnapshotType } from "@/lib/snapshots/types";

export function formatSnapshotDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function snapshotTypeLabel(type: SnapshotType): string {
  return type === "move_in" ? "Move-In" : "Move-Out";
}
