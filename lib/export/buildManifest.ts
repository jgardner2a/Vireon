import { EVIDENCE_MODULE_LABELS } from "@/lib/export/types";
import type {
  EvidencePackageContent,
  EvidencePackageRecord,
  PreparedExportImage,
} from "@/lib/export/types";

export type ManifestFileEntry = {
  path: string;
  moduleId: string;
  recordId: string;
  recordTitle: string;
  fileName: string;
  storagePath: string;
};

export type EvidenceManifest = {
  version: "1.0";
  generatedAt: string;
  generatedBy: "Vireon";
  exporterEmail: string | null;
  property: {
    homeId: string;
    name: string;
    address: string;
  };
  summary: {
    recordCount: number;
    imageCount: number;
    recordsByModule: Record<string, number>;
  };
  records: Array<{
    moduleId: string;
    moduleLabel: string;
    id: string;
    title: string;
    status: string | null;
    category: string | null;
    createdAt: string;
    updatedAt: string | null;
    imageCount: number;
  }>;
  files: ManifestFileEntry[];
};

function imageZipPath(record: EvidencePackageRecord, fileName: string): string {
  return `images/${record.moduleId}/${record.id}/${fileName}`;
}

export function buildImageManifestPath(
  record: EvidencePackageRecord,
  fileName: string
): string {
  return imageZipPath(record, fileName);
}

export function buildEvidenceManifest(
  content: EvidencePackageContent,
  preparedImages: Map<string, PreparedExportImage>
): EvidenceManifest {
  const recordsByModule: Record<string, number> = {};
  const files: ManifestFileEntry[] = [];

  for (const record of content.records) {
    recordsByModule[record.moduleId] =
      (recordsByModule[record.moduleId] ?? 0) + 1;

    for (const image of record.images) {
      const prepared = preparedImages.get(image.storagePath);
      const fileName = prepared?.fileName ?? image.fileName;
      files.push({
        path: imageZipPath(record, fileName),
        moduleId: record.moduleId,
        recordId: record.id,
        recordTitle: record.title,
        fileName,
        storagePath: image.storagePath,
      });
    }
  }

  return {
    version: "1.0",
    generatedAt: content.exportedAt,
    generatedBy: "Vireon",
    exporterEmail: content.exporterEmail,
    property: content.property,
    summary: {
      recordCount: content.records.length,
      imageCount: files.length,
      recordsByModule,
    },
    records: content.records.map((record) => ({
      moduleId: record.moduleId,
      moduleLabel: EVIDENCE_MODULE_LABELS[record.moduleId],
      id: record.id,
      title: record.title,
      status: record.status,
      category: record.category,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      imageCount: record.images.length,
    })),
    files,
  };
}
