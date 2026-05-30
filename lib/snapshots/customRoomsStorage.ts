import type { SnapshotRoom } from "@/lib/snapshots/roomConfig";

const STORAGE_PREFIX = "vireon:snapshot-custom-rooms:";

function isSnapshotRoom(value: unknown): value is SnapshotRoom {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return typeof row.slug === "string" && typeof row.label === "string";
}

export function loadSnapshotCustomRooms(snapshotId: string): SnapshotRoom[] {
  if (typeof window === "undefined" || !snapshotId) {
    return [];
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${snapshotId}`);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSnapshotRoom);
  } catch {
    return [];
  }
}

export function saveSnapshotCustomRooms(
  snapshotId: string,
  rooms: SnapshotRoom[]
): void {
  if (typeof window === "undefined" || !snapshotId) {
    return;
  }

  localStorage.setItem(`${STORAGE_PREFIX}${snapshotId}`, JSON.stringify(rooms));
}
