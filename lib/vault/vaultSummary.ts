import { MODULE_SECTION_COPY } from "@/lib/export/packageCopy";
import type { EvidenceInventory, EvidenceModuleId } from "@/lib/export/types";

/** Display order for the Vault summary page (snapshots first). */
const VAULT_MODULE_IDS: EvidenceModuleId[] = [
  "snapshots",
  "maintenance",
  "complex",
  "communications",
  "notes",
];
export type VaultModuleSummary = {
  moduleId: EvidenceModuleId;
  title: string;
  recordCount: number;
  imageCount: number;
};

export type VaultSummary = {
  totalRecords: number;
  totalImages: number;
  activeModules: number;
  modules: VaultModuleSummary[];
  lastRecordedAt: string | null;
};

export function computeVaultSummary(inventory: EvidenceInventory): VaultSummary {
  let totalRecords = 0;
  let totalImages = 0;
  let activeModules = 0;
  let lastRecordedAt: string | null = null;

  const modules: VaultModuleSummary[] = VAULT_MODULE_IDS.map((moduleId) => {    const section = inventory.sections.find(
      (entry) => entry.moduleId === moduleId
    );
    const items = section?.items ?? [];
    const recordCount = items.length;
    const imageCount = items.reduce((sum, item) => sum + item.imageCount, 0);

    totalRecords += recordCount;
    totalImages += imageCount;
    if (recordCount > 0) {
      activeModules += 1;
    }

    for (const item of items) {
      if (
        !lastRecordedAt ||
        new Date(item.createdAt).getTime() > new Date(lastRecordedAt).getTime()
      ) {
        lastRecordedAt = item.createdAt;
      }
    }

    return {
      moduleId,
      title: MODULE_SECTION_COPY[moduleId].title,
      recordCount,
      imageCount,
    };
  });

  return {
    totalRecords,
    totalImages,
    activeModules,
    modules,
    lastRecordedAt,
  };
}
