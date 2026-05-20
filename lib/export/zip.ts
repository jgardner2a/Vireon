import JSZip from "jszip";
import type { ExportFileEntry, ExportPackage } from "./types";

export async function packageExportZip(
  profile: ExportPackage["profile"],
  scope: ExportPackage["scope"],
  generatedAt: string,
  files: ExportFileEntry[]
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  for (const file of files) {
    if (typeof file.content === "string") {
      zip.file(file.path, file.content);
    } else {
      zip.file(file.path, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const scopeLabel =
    scope.kind === "property"
      ? `property-${scope.propertyId.slice(0, 8)}`
      : scope.kind === "issue"
        ? `issue-${scope.issueId.slice(0, 8)}`
        : "all-properties";

  const tier = profile === "FULL_PACKAGE" ? "full" : "basic";
  const filename = `vireon-evidence-${tier}-${scopeLabel}-${generatedAt.slice(0, 10)}.zip`;

  return { blob, filename };
}
