import type { IssueStatus } from "../issueStatus";

/** Discriminated union — stable shape for timeline UI and future exporters */
export type VaultEntryType = "issue" | "image";

export type VaultImageSource = "issue" | "gallery";

export interface VaultExportMeta {
  /** Stable id for deduplication in exports */
  entryId: string;
  /** Underlying record type in localStorage */
  recordType: "issue" | "gallery";
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
  caption: string;
}

export type VaultEntry = VaultIssueEntry | VaultImageEntry;

/** Chronological feed grouped by property */
export interface VaultPropertyFeed {
  propertyId: string | null;
  propertyName: string;
  propertyAddress?: string;
  entries: VaultEntry[];
}

/** Payload shape for a future export API / PDF generator */
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
