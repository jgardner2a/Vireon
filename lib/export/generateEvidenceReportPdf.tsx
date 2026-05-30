import type { EvidencePackageContent } from "@/lib/export/types";

export async function generateEvidenceReportPdf(
  content: EvidencePackageContent,
  imageDataByPath: Record<string, string | null>
): Promise<Blob> {
  const [{ pdf }, { EvidenceReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/export/EvidenceReportDocument"),
  ]);

  return pdf(
    <EvidenceReportDocument
      content={content}
      imageDataByPath={imageDataByPath}
    />
  ).toBlob();
}
