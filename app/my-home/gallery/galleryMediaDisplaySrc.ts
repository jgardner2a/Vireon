import type { GalleryMedia } from "@/lib/gallery";

/** Prefer thumbnail URL for display; fall back to full asset. */
export function galleryMediaDisplaySrc(media: GalleryMedia): string {
  return media.thumbnailUrl || media.dataUrl;
}
