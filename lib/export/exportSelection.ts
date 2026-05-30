import {
  EVIDENCE_MODULE_IDS,
  type EvidenceExportSection,
  type EvidenceInventory,
  type EvidenceModuleId,
  type ExportPreview,
  type ExportSelectionState,
  type ModuleSelection,
} from "@/lib/export/types";

const DEFAULT_EXPANDED_ITEM_LIMIT = 5;

function emptyModuleSelection(): ModuleSelection {
  return { expanded: false, items: {} };
}

export function createDefaultExportSelection(
  inventory: EvidenceInventory
): ExportSelectionState {
  const state = Object.fromEntries(
    EVIDENCE_MODULE_IDS.map((moduleId) => [moduleId, emptyModuleSelection()])
  ) as ExportSelectionState;

  for (const section of inventory.sections) {
    const items: Record<string, boolean> = {};
    for (const item of section.items) {
      items[item.id] = true;
    }
    state[section.moduleId] = {
      expanded:
        section.items.length > 0 &&
        section.items.length <= DEFAULT_EXPANDED_ITEM_LIMIT,
      items,
    };
  }

  return state;
}

export function countSelectedItems(
  section: EvidenceExportSection,
  selection: ModuleSelection
): number {
  return section.items.filter((item) => selection.items[item.id]).length;
}

export function isModuleFullySelected(
  section: EvidenceExportSection,
  selection: ModuleSelection
): boolean {
  if (section.items.length === 0) {
    return false;
  }
  return section.items.every((item) => selection.items[item.id]);
}

export function isModulePartiallySelected(
  section: EvidenceExportSection,
  selection: ModuleSelection
): boolean {
  const selectedCount = countSelectedItems(section, selection);
  return selectedCount > 0 && selectedCount < section.items.length;
}

export function setModuleSelection(
  state: ExportSelectionState,
  moduleId: EvidenceModuleId,
  checked: boolean,
  section: EvidenceExportSection
): ExportSelectionState {
  const nextItems: Record<string, boolean> = {};
  for (const item of section.items) {
    nextItems[item.id] = checked;
  }

  return {
    ...state,
    [moduleId]: {
      ...state[moduleId],
      items: nextItems,
    },
  };
}

export function setItemSelection(
  state: ExportSelectionState,
  moduleId: EvidenceModuleId,
  itemId: string,
  checked: boolean
): ExportSelectionState {
  return {
    ...state,
    [moduleId]: {
      ...state[moduleId],
      items: {
        ...state[moduleId].items,
        [itemId]: checked,
      },
    },
  };
}

export function setModuleExpanded(
  state: ExportSelectionState,
  moduleId: EvidenceModuleId,
  expanded: boolean
): ExportSelectionState {
  return {
    ...state,
    [moduleId]: {
      ...state[moduleId],
      expanded,
    },
  };
}

export function computeExportPreview(
  inventory: EvidenceInventory,
  selection: ExportSelectionState
): ExportPreview {
  let recordCount = 0;
  let imageCount = 0;

  const modules = inventory.sections.map((section) => {
    const moduleSelection = selection[section.moduleId];
    let selectedRecords = 0;
    let selectedImages = 0;

    for (const item of section.items) {
      if (moduleSelection.items[item.id]) {
        selectedRecords += 1;
        selectedImages += item.imageCount;
      }
    }

    recordCount += selectedRecords;
    imageCount += selectedImages;

    return {
      moduleId: section.moduleId,
      label: section.label,
      selectedRecords,
      totalRecords: section.items.length,
      selectedImages,
    };
  });

  return {
    recordCount,
    imageCount,
    hasSelection: recordCount > 0,
    modules,
  };
}
