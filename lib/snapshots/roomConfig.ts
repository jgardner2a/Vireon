export type SnapshotRoom = {
  slug: string;
  label: string;
};

/**
 * Standard move-in / move-out walkthrough rooms (always shown in UI).
 * Order matches the two-column grid on the snapshot detail page.
 */
export const SNAPSHOT_ROOMS: SnapshotRoom[] = [
  { slug: "living_room", label: "Living Room" },
  { slug: "dining_room", label: "Dining Room" },
  { slug: "kitchen", label: "Kitchen" },
  { slug: "hallway", label: "Hallway/Entry" },
  { slug: "master_bedroom", label: "Master Bedroom" },
  { slug: "master_bathroom", label: "Master Bathroom" },
  { slug: "bedroom", label: "Bedroom" },
  { slug: "bathroom", label: "Bathroom" },
  { slug: "balcony_patio", label: "Balcony/Patio" },
  { slug: "closets", label: "Closets" },
];

export const STANDARD_SNAPSHOT_ROOM_SLUGS = new Set(
  SNAPSHOT_ROOMS.map((room) => room.slug)
);

export const SNAPSHOT_ROOM_OTHER_SLUG = "other";

export function isStandardSnapshotRoomSlug(slug: string): boolean {
  return (
    STANDARD_SNAPSHOT_ROOM_SLUGS.has(slug) || slug === SNAPSHOT_ROOM_OTHER_SLUG
  );
}

export function slugifySnapshotRoomLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return slug || "room";
}

export function snapshotRoomLabel(
  slug: string,
  customRooms: SnapshotRoom[] = []
): string {
  const match = [...SNAPSHOT_ROOMS, ...customRooms].find((room) => room.slug === slug);
  if (match) {
    return match.label;
  }
  if (slug === SNAPSHOT_ROOM_OTHER_SLUG) {
    return "Other";
  }

  return slug
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Map DB `room` text to a slug for grouping. Unknown values keep a stable custom slug. */
export function normalizeSnapshotRoomSlug(
  room: string | null | undefined
): string {
  if (!room?.trim()) {
    return SNAPSHOT_ROOM_OTHER_SLUG;
  }

  const value = room.trim().toLowerCase().replace(/\s+/g, "_");

  for (const entry of SNAPSHOT_ROOMS) {
    if (entry.slug === value) {
      return entry.slug;
    }
    if (slugifySnapshotRoomLabel(entry.label) === slugifySnapshotRoomLabel(value)) {
      return entry.slug;
    }
  }

  if (value === "other" || value === "unassigned") {
    return SNAPSHOT_ROOM_OTHER_SLUG;
  }

  return slugifySnapshotRoomLabel(room);
}

/** Standard rooms, user-added rooms, and rooms referenced on this snapshot. */
export function mergeSnapshotRooms(
  customRooms: SnapshotRoom[],
  displayImages: { roomSlug: string }[],
  issues: { room: string | null }[]
): SnapshotRoom[] {
  const seen = new Set<string>();
  const merged: SnapshotRoom[] = [];

  const addRoom = (room: SnapshotRoom) => {
    if (seen.has(room.slug)) {
      return;
    }
    seen.add(room.slug);
    merged.push(room);
  };

  for (const room of SNAPSHOT_ROOMS) {
    addRoom(room);
  }

  for (const room of customRooms) {
    if (!isStandardSnapshotRoomSlug(room.slug)) {
      addRoom(room);
    }
  }

  const labelContext = customRooms;

  for (const image of displayImages) {
    const slug = image.roomSlug;
    if (slug === SNAPSHOT_ROOM_OTHER_SLUG || isStandardSnapshotRoomSlug(slug)) {
      continue;
    }
    addRoom({ slug, label: snapshotRoomLabel(slug, labelContext) });
  }

  for (const issue of issues) {
    const slug = normalizeSnapshotRoomSlug(issue.room);
    if (slug === SNAPSHOT_ROOM_OTHER_SLUG || isStandardSnapshotRoomSlug(slug)) {
      continue;
    }
    addRoom({ slug, label: snapshotRoomLabel(slug, labelContext) });
  }

  return merged;
}
