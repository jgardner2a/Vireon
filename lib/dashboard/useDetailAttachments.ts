import { useEffect, useState } from "react";
import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import { STORAGE_BUCKET } from "@/lib/storagePath";

export type DetailAttachment = {
  id: string;
  storage_path: string;
  previewUrl: string;
};

type AttachmentRow = {
  id: string;
  storage_path: string;
};

type FetchAttachmentsResult =
  | { ok: true; items: AttachmentRow[] }
  | { ok: false; message: string };

export function useDetailAttachments(
  userId: string | null,
  homeId: string | null,
  recordId: string | null,
  fetchAttachments: (
    userId: string,
    homeId: string,
    recordId: string
  ) => Promise<FetchAttachmentsResult>
): { attachments: DetailAttachment[]; loading: boolean } {
  const [attachments, setAttachments] = useState<DetailAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !homeId || !recordId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);

      const result = await fetchAttachments(userId, homeId, recordId);

      if (cancelled) {
        return;
      }

      if (!result.ok || result.items.length === 0) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      try {
        const paths = result.items.map((item) => item.storage_path);
        const signed = await resolveSignedGalleryUrls(
          userId,
          homeId,
          paths,
          STORAGE_BUCKET
        );

        if (cancelled) {
          return;
        }

        setAttachments(
          result.items.map((item, index) => ({
            id: item.id,
            storage_path: item.storage_path,
            previewUrl: signed[index]?.url ?? "",
          }))
        );
      } catch {
        if (!cancelled) {
          setAttachments([]);
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // fetchAttachments is a stable module export from each page.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [userId, homeId, recordId]);

  return { attachments, loading };
}
