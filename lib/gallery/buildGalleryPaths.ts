import type { GalleryItem } from "@/lib/gallery/types";

/** Gallery rows → storage paths (newest first, matches grid order). */
export function buildPathsFromGalleryItems(items: GalleryItem[]): string[] {
  return items
    .map((item) => item.storage_path.trim())
    .filter((path) => path.length > 0);
}
