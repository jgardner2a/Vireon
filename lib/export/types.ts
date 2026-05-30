export type EvidenceModuleId =
  | "maintenance"
  | "complex"
  | "communications"
  | "notes"
  | "snapshots";

export const EVIDENCE_MODULE_IDS: EvidenceModuleId[] = [
  "maintenance",
  "complex",
  "communications",
  "notes",
  "snapshots",
];

export const EVIDENCE_MODULE_LABELS: Record<EvidenceModuleId, string> = {
  maintenance: "Maintenance logs",
  complex: "Complex issues",
  communications: "Communications",
  notes: "Notes",
  snapshots: "Move-in/out snapshots",
};

export type EvidenceExportItem = {
  id: string;
  title: string;
  detail: string;
  imageCount: number;
  createdAt: string;
};

export type EvidenceExportSection = {
  moduleId: EvidenceModuleId;
  label: string;
  items: EvidenceExportItem[];
};

export type EvidenceInventory = {
  sections: EvidenceExportSection[];
};

export type ModuleSelection = {
  expanded: boolean;
  items: Record<string, boolean>;
};

export type ExportSelectionState = Record<EvidenceModuleId, ModuleSelection>;

export type ExportPreview = {
  recordCount: number;
  imageCount: number;
  hasSelection: boolean;
  modules: {
    moduleId: EvidenceModuleId;
    label: string;
    selectedRecords: number;
    totalRecords: number;
    selectedImages: number;
  }[];
};

export type EvidencePackageImage = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  room: string | null;
  orderIndex: number | null;
};

export type EvidenceSnapshotIssue = {
  label: string;
  room: string | null;
  notes: string | null;
  severity: string | null;
};

export type EvidencePackageRecord = {
  moduleId: EvidenceModuleId;
  id: string;
  title: string;
  status: string | null;
  category: string | null;
  detailLabel: string | null;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  images: EvidencePackageImage[];
  snapshotType?: "move_in" | "move_out";
  snapshotIssues?: EvidenceSnapshotIssue[];
};

export type EvidencePackageContent = {
  property: {
    homeId: string;
    name: string;
    address: string;
  };
  exportedAt: string;
  exporterEmail: string | null;
  records: EvidencePackageRecord[];
};

export type ExportProgress = {
  phase: "gathering" | "images" | "pdf" | "zip" | "done";
  message: string;
};

export type PreparedExportImage = {
  storagePath: string;
  fileName: string;
  zipBytes: Uint8Array;
  pdfDataUrl: string | null;
};
