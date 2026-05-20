/**
 * INTERNAL: Supabase evidence_links persistence.
 * Import only from `lib/evidence/persistLinks.ts`.
 */
import type { EvidenceLink } from "../evidence/types";
import { dataCache } from "./cache";
import { getProfileId } from "./profile";
import { supabase } from "../supabaseClient";

function syncEmbeddedEvidenceFromLinks(): void {
  const bySource = new Map<string, EvidenceLink>();
  for (const link of dataCache.evidenceLinks) {
    bySource.set(`${link.sourceType}:${link.sourceId}`, link);
  }

  dataCache.galleryMedia = dataCache.galleryMedia.map((media) => {
    const link = bySource.get(`media:${media.id}`);
    const next = { ...media };
    if (link) {
      next.evidenceLink = { type: link.targetType, id: link.targetId };
    } else {
      delete next.evidenceLink;
    }
    return next;
  });

  dataCache.folders = dataCache.folders.map((folder) => {
    const link = bySource.get(`folder:${folder.id}`);
    const next = { ...folder };
    if (link) {
      next.evidenceLink = { type: link.targetType, id: link.targetId };
    } else {
      delete next.evidenceLink;
    }
    return next;
  });
}

export function listPersistedEvidenceLinks(): EvidenceLink[] {
  return [...dataCache.evidenceLinks];
}

export async function upsertEvidenceLink(
  link: EvidenceLink
): Promise<boolean> {
  const profileId = getProfileId();
  if (!profileId) return false;

  const { error } = await supabase.from("evidence_links").upsert(
    {
      profile_id: profileId,
      source_type: link.sourceType,
      source_id: link.sourceId,
      target_type: link.targetType,
      target_id: link.targetId,
    },
    { onConflict: "profile_id,source_type,source_id" }
  );

  if (error) {
    console.error("[evidence] upsert", error);
    return false;
  }

  const idx = dataCache.evidenceLinks.findIndex(
    (row) =>
      row.sourceType === link.sourceType && row.sourceId === link.sourceId
  );
  if (idx === -1) {
    dataCache.evidenceLinks.push(link);
  } else {
    dataCache.evidenceLinks[idx] = link;
  }

  syncEmbeddedEvidenceFromLinks();
  return true;
}

export async function clearEvidenceLink(
  sourceType: EvidenceLink["sourceType"],
  sourceId: string
): Promise<boolean> {
  const profileId = getProfileId();
  if (!profileId) return false;

  const { error } = await supabase
    .from("evidence_links")
    .delete()
    .eq("profile_id", profileId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) {
    console.error("[evidence] clear", error);
    return false;
  }

  dataCache.evidenceLinks = dataCache.evidenceLinks.filter(
    (row) => !(row.sourceType === sourceType && row.sourceId === sourceId)
  );
  syncEmbeddedEvidenceFromLinks();
  return true;
}
