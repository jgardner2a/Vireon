/** Export output mode — formatting only; does not change Supabase data. */
export type ExportProfile = "BASIC_SNAPSHOT" | "FULL_PACKAGE";

export type ExportScope =
  | { kind: "property"; propertyId: string }
  | { kind: "issue"; issueId: string; propertyId: string }
  | { kind: "all_properties" };

export type ExportRequest = {
  email: string;
  profileId: string;
  profile: ExportProfile;
  scope: ExportScope;
};

export type ExportPropertyRow = {
  id: string;
  name: string;
  address: string;
  created_at: string;
};

export type ExportIssueRow = {
  id: string;
  property_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

/** Gallery media for export — originals only (`storage_path` in `gallery` bucket). */
export type ExportMediaRow = {
  id: string;
  property_id: string;
  folder_id: string;
  name: string;
  mime_type: string;
  media_type: "image" | "video";
  /** Original object path; must not be thumbnail_path or gallery-thumbnails layout. */
  storage_path: string;
  created_at: string;
};

export type ExportFolderRow = {
  id: string;
  property_id: string;
  name: string;
  folder_type: string;
  created_at: string;
};

export type ExportDocumentRow = {
  id: string;
  property_id: string;
  name: string;
  file_name: string | null;
  mime_type: string | null;
  storage_path: string | null;
  created_at: string;
};

export type ExportEvidenceLinkRow = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

/** Snapshot loaded from Supabase only (never from UI cache). */
export type ExportSourceData = {
  fetchedAt: string;
  profileId: string;
  scope: ExportScope;
  properties: ExportPropertyRow[];
  issues: ExportIssueRow[];
  folders: ExportFolderRow[];
  media: ExportMediaRow[];
  documents: ExportDocumentRow[];
  evidenceLinks: ExportEvidenceLinkRow[];
};

export type ExportTimelineEvent = {
  id: string;
  occurredAt: string;
  type: "issue" | "media" | "evidence_link" | "document";
  label: string;
  propertyId: string | null;
  refId: string;
};

export type ExportEvidenceGraph = {
  version: 1;
  nodes: Array<{
    id: string;
    kind: "source" | "target";
    entityType: string;
    label: string;
  }>;
  edges: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }>;
};

export type ExportInsightsSnapshot = {
  totalIssues: number;
  openIssues: number;
  totalMedia: number;
  totalEvidenceLinks: number;
  issuesWithEvidence: number;
};

export type ExportFileEntry = {
  path: string;
  content: Uint8Array | string;
};

export type ExportPackage = {
  profile: ExportProfile;
  scope: ExportScope;
  generatedAt: string;
  files: ExportFileEntry[];
  filename: string;
};

export type ExportResult =
  | { ok: true; package: ExportPackage }
  | { ok: false; code: string; message: string };
