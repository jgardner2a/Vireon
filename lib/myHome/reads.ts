/**
 * My Home — read-only accessors for hydrated cache data.
 *
 * Vault and Insights must import from here (or layer-specific re-exports),
 * not from *Store modules directly, to keep input-layer boundaries explicit.
 */

export {
  getCurrentProperty,
  getPreviousProperties,
  listProperties,
  type Property,
} from "../propertiesStore";

export {
  listIssues,
  getIssueById,
  getPropertyForIssue,
  listIssuesByPropertyId,
  type Issue,
} from "../issuesStore";

export {
  listGalleryMedia,
  listGalleryMediaByPropertyId,
  listGalleryMediaByFolderId,
  type GalleryMedia,
} from "../galleryStore";

export {
  listFolders,
  listFoldersByPropertyId,
  getFolderById,
  type Folder,
} from "../galleryFoldersStore";

export { listLeases, getLeaseByPropertyId, type Lease } from "../leasesStore";

export {
  listIncidents,
  listIncidentsByPropertyId,
  getIncidentById,
  type IncidentLog,
} from "../incidentsStore";

export {
  listDocuments,
  listDocumentsByPropertyId,
  getDocumentById,
  type Document,
} from "../documentsStore";
