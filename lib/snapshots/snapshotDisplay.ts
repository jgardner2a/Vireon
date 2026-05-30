import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import { normalizeSnapshotRoomSlug } from "@/lib/snapshots/roomConfig";
import type { SnapshotImage } from "@/lib/snapshots/types";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

export type SnapshotDisplayImage = {
  snapshotImage: SnapshotImage;
  previewUrl: string;
  fileName: string;
  roomSlug: string;
};

type GalleryPathRow = {
  id: string;
  storage_path: string;
  file_name: string | null;
};

export async function buildSnapshotDisplayImages(
  userId: string,
  homeId: string,
  snapshotImages: SnapshotImage[]
): Promise<
  { ok: true; images: SnapshotDisplayImage[] } | { ok: false; message: string }
> {
  if (snapshotImages.length === 0) {
    return { ok: true, images: [] };
  }

  const galleryIds = snapshotImages.map((image) => image.gallery_id);

  const { data, error } = await supabase
    .from("gallery")
    .select("id, storage_path, file_name")
    .in("id", galleryIds);

  if (error) {
    return {
      ok: false,
      message: error.message || "Could not load snapshot images.",
    };
  }

  const galleryById = new Map(
    (data ?? []).map((row) => [String((row as GalleryPathRow).id), row as GalleryPathRow])
  );

  const paths: string[] = [];
  const orderedPairs: { snapshotImage: SnapshotImage; gallery: GalleryPathRow }[] =
    [];

  for (const snapshotImage of snapshotImages) {
    const gallery = galleryById.get(snapshotImage.gallery_id);
    if (!gallery) {
      continue;
    }
    orderedPairs.push({ snapshotImage, gallery });
    paths.push(gallery.storage_path);
  }

  const signed =
    paths.length > 0
      ? await resolveSignedGalleryUrls(userId, homeId, paths, STORAGE_BUCKET)
      : [];

  const images: SnapshotDisplayImage[] = orderedPairs
    .map(({ snapshotImage, gallery }, index) => {
      const previewUrl = signed[index]?.url;
      if (!previewUrl) {
        return null;
      }

      return {
        snapshotImage,
        previewUrl,
        fileName: gallery.file_name ?? gallery.storage_path,
        roomSlug: normalizeSnapshotRoomSlug(snapshotImage.room),
      };
    })
    .filter((image): image is SnapshotDisplayImage => image !== null);

  return { ok: true, images };
}
