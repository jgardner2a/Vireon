import type { EvidenceLink } from "../evidence/types";
import type { GalleryMedia } from "../galleryStore";
import type { Folder } from "../galleryFoldersStore";
import type { IncidentLog } from "../incidentsStore";
import type { Issue } from "../issuesStore";
import type { Lease } from "../leasesStore";
import type { Property } from "../propertiesStore";
import type { Document } from "../documentsStore";

/**
 * In-memory mirror of Supabase — NOT source of truth.
 * Populated by hydrateFromSupabase(); never treat as durable storage.
 *
 * Subscription tier is NEVER cached here. Use `getSubscriptionPlan(profileId)`.
 * Property limits use `countPropertiesForProfile(profileId)`, not cache counts.
 */
export type DataCache = {
  hydrated: boolean;
  profileId: string | null;
  profileEmail: string | null;
  properties: Property[];
  issues: Issue[];
  folders: Folder[];
  galleryMedia: GalleryMedia[];
  evidenceLinks: EvidenceLink[];
  leases: Lease[];
  incidents: IncidentLog[];
  documents: Document[];
};

export const dataCache: DataCache = {
  hydrated: false,
  profileId: null,
  profileEmail: null,
  properties: [],
  issues: [],
  folders: [],
  galleryMedia: [],
  evidenceLinks: [],
  leases: [],
  incidents: [],
  documents: [],
};

export function resetDataCache(): void {
  dataCache.hydrated = false;
  dataCache.profileId = null;
  dataCache.profileEmail = null;
  dataCache.properties = [];
  dataCache.issues = [];
  dataCache.folders = [];
  dataCache.galleryMedia = [];
  dataCache.evidenceLinks = [];
  dataCache.leases = [];
  dataCache.incidents = [];
  dataCache.documents = [];
}

export function assertDataHydrated(): void {
  if (typeof window === "undefined") return;
  if (!dataCache.hydrated) {
    throw new Error(
      "Renter data is not hydrated yet. Wait for bootstrapMyHomeData() to finish."
    );
  }
}
