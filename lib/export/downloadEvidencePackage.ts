import { buildEvidenceManifest } from "@/lib/export/buildManifest";
import { formatExportFileStamp } from "@/lib/export/formatExportDate";
import { gatherEvidencePackageContent } from "@/lib/export/gatherEvidencePackageContent";
import { generateEvidenceReportPdf } from "@/lib/export/generateEvidenceReportPdf";
import { getSelectedItemIds } from "@/lib/export/getSelectedItemIds";
import { PACKAGE_PDF_FILENAME, PACKAGE_README } from "@/lib/export/packageCopy";
import {
  prepareExportImages,
  sanitizeExportArchiveName,
} from "@/lib/export/prepareExportImages";
import type {
  EvidenceInventory,
  EvidencePackageRecord,
  ExportProgress,
  ExportSelectionState,
} from "@/lib/export/types";

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function imageZipPath(record: EvidencePackageRecord, fileName: string): string {
  return `images/${record.moduleId}/${record.id}/${fileName}`;
}

export async function downloadEvidencePackage(input: {
  userId: string;
  homeId: string;
  homeName: string;
  homeAddress: string;
  exporterEmail: string | null;
  inventory: EvidenceInventory;
  selection: ExportSelectionState;
  onProgress?: (progress: ExportProgress) => void;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const reportProgress = (phase: ExportProgress["phase"], message: string) => {
    input.onProgress?.({ phase, message });
  };

  try {
    reportProgress("gathering", "Gathering selected records…");

    const selectedIds = getSelectedItemIds(input.inventory, input.selection);
    const contentResult = await gatherEvidencePackageContent({
      userId: input.userId,
      homeId: input.homeId,
      homeName: input.homeName,
      homeAddress: input.homeAddress,
      exporterEmail: input.exporterEmail,
      selectedIds,
    });

    if (!contentResult.ok) {
      return contentResult;
    }

    const content = contentResult.content;
    const imageItems = content.records.flatMap((record) =>
      record.images.map((image) => ({
        storagePath: image.storagePath,
        fileName: image.fileName,
      }))
    );

    reportProgress("images", "Downloading images…");
    const preparedImages = await prepareExportImages(
      imageItems,
      (completed, total) => {
        reportProgress(
          "images",
          total > 0
            ? `Downloading images (${completed} of ${total})…`
            : "Downloading images…"
        );
      }
    );

    const imageDataByPath: Record<string, string | null> = {};
    for (const [storagePath, prepared] of preparedImages.entries()) {
      imageDataByPath[storagePath] = prepared.pdfDataUrl;
    }

    reportProgress("pdf", "Building PDF report…");
    const pdfBlob = await generateEvidenceReportPdf(content, imageDataByPath);

    reportProgress("zip", "Creating download package…");
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    zip.file("README.txt", PACKAGE_README);
    zip.file(
      "manifest.json",
      JSON.stringify(
        buildEvidenceManifest(content, preparedImages),
        null,
        2
      )
    );
    zip.file(PACKAGE_PDF_FILENAME, pdfBlob);

    for (const record of content.records) {
      for (const image of record.images) {
        const prepared = preparedImages.get(image.storagePath);
        if (!prepared) {
          continue;
        }
        zip.file(
          imageZipPath(record, prepared.fileName),
          prepared.zipBytes
        );
      }
    }

    const archiveBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const stamp = formatExportFileStamp(content.exportedAt);
    const archiveName = `Vireon_Evidence_${sanitizeExportArchiveName(
      content.property.name
    )}_${stamp}.zip`;

    triggerBrowserDownload(archiveBlob, archiveName);
    reportProgress("done", "Download started.");
    return { ok: true };
  } catch (error) {
    console.error("[export] download package", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not generate the evidence package.",
    };
  }
}
