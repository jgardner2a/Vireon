import type {
  EvidenceInventory,
  EvidenceModuleId,
  ExportSelectionState,
} from "@/lib/export/types";

export function getSelectedItemIds(
  inventory: EvidenceInventory,
  selection: ExportSelectionState
): Record<EvidenceModuleId, string[]> {
  const selected = {} as Record<EvidenceModuleId, string[]>;

  for (const section of inventory.sections) {
    const moduleSelection = selection[section.moduleId];
    selected[section.moduleId] = section.items
      .filter((item) => moduleSelection.items[item.id])
      .map((item) => item.id);
  }

  return selected;
}
