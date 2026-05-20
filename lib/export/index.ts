/**
 * Export Engine — read-only sidecar (Supabase fetch only).
 *
 * Tier authority: app/api/export/route.ts only.
 * Vault triggers via triggerExportDownload({ scope }) — no profile in requests.
 */

export type {
  ExportProfile,
  ExportRequest,
  ExportResult,
  ExportScope,
  ExportSourceData,
} from "./types";

export { runExport } from "./engine";

export {
  triggerExportDownload,
  requestFullExportUpgradeCheck,
  type TriggerExportOptions,
  type TriggerExportResult,
} from "./client";
