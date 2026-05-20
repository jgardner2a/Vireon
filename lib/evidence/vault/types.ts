import type { EvidenceLink } from "../types";
import type { IssueStatus } from "../../issueStatus";

/**
 * Read-only view models for the Evidence Vault UI.
 * These types are projections — not persisted separately from My Home stores.
 */

export type VaultEntryType = "issue" | "image" | "lease";

export type VaultImageSource = "issue" | "gallery";

export interface VaultExportMeta {
  entryId: string;
  recordType: "issue" | "gallery" | "lease";
  recordId: string;
  propertyId: string | null;
  occurredAt: string;
  exportVersion: 1;
}

interface VaultEntryBase {
  id: string;
  type: VaultEntryType;
  propertyId: string | null;
  propertyName: string;
  occurredAt: string;
  exportMeta: VaultExportMeta;
}

export interface VaultIssueEntry extends VaultEntryBase {
  type: "issue";
  issueId: string | number;
  title: string;
  description: string;
  status: IssueStatus;
  imageCount: number;
}

export interface VaultImageEntry extends VaultEntryBase {
  type: "image";
  imageUrl: string;
  imageSource: VaultImageSource;
  issueId?: string | number;
  issueTitle?: string;
  galleryMediaId?: string | number;
  /** Resolved source → target relationship (read from gallery stores). */
  evidenceRelationship?: EvidenceLink;
  caption: string;
}

export interface VaultLeaseEntry extends VaultEntryBase {
  type: "lease";
  leaseId: string | number;
  title: string;
  startDate: string;
  endDate: string | null;
}

export type VaultEntry = VaultIssueEntry | VaultImageEntry | VaultLeaseEntry;

export interface VaultSummary {
  totalEntries: number;
  issueCount: number;
  imageCount: number;
  leaseCount: number;
  propertyCount: number;
  mediaIssueLinkCount: number;
}

export type VaultMediaIssueRelationship = {
  mediaEntryId: string;
  mediaCaption: string;
  issueId: string;
  issueTitle: string;
};

export type VaultMediaLeaseRelationship = {
  mediaEntryId: string;
  mediaCaption: string;
  leaseId: string;
  leaseTitle: string;
};

export type VaultPropertyRelationships = {
  propertyId: string | null;
  propertyName: string;
  lease: { id: string; title: string } | null;
  issues: Array<{
    id: string;
    title: string;
    status: IssueStatus;
    linkedMediaCount: number;
  }>;
  mediaIssueLinks: VaultMediaIssueRelationship[];
  mediaLeaseLinks: VaultMediaLeaseRelationship[];
};

export interface VaultPropertyFeed {
  propertyId: string | null;
  propertyName: string;
  propertyAddress?: string;
  entries: VaultEntry[];
}

export interface VaultExportBundle {
  format: "vireon-vault-v1";
  generatedAt: string;
  scope: "all" | "property";
  propertyId: string | null;
  propertyName: string | null;
  summary: {
    totalEntries: number;
    issueCount: number;
    imageCount: number;
    propertyCount: number;
  };
  feeds: VaultPropertyFeed[];
}

export type VaultFolderContainer = {
  folderId: string;
  folderName: string;
  folderEvidenceLabel: string | null;
  media: VaultImageEntry[];
};
