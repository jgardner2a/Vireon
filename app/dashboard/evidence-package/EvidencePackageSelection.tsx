"use client";

import { useEffect, useRef } from "react";
import {
  countSelectedItems,
  isModuleFullySelected,
  isModulePartiallySelected,
} from "@/lib/export/exportSelection";
import type {
  EvidenceExportSection,
  ExportSelectionState,
} from "@/lib/export/types";

type EvidenceModuleSectionProps = {
  section: EvidenceExportSection;
  selection: ExportSelectionState[EvidenceExportSection["moduleId"]];
  onToggleModule: (checked: boolean) => void;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onToggleExpanded: () => void;
};

function EvidenceModuleSection({
  section,
  selection,
  onToggleModule,
  onToggleItem,
  onToggleExpanded,
}: EvidenceModuleSectionProps) {
  const moduleCheckboxRef = useRef<HTMLInputElement>(null);
  const isEmpty = section.items.length === 0;
  const selectedCount = countSelectedItems(section, selection);
  const totalImages = section.items.reduce(
    (sum, item) => sum + item.imageCount,
    0
  );
  const selectedImages = section.items.reduce(
    (sum, item) => sum + (selection.items[item.id] ? item.imageCount : 0),
    0
  );
  const fullySelected = isModuleFullySelected(section, selection);
  const partiallySelected = isModulePartiallySelected(section, selection);
  const moduleInputId = `evidence-module-${section.moduleId}`;

  useEffect(() => {
    if (moduleCheckboxRef.current) {
      moduleCheckboxRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  const summaryLabel = isEmpty
    ? "Nothing to include"
    : `${section.items.length} ${
        section.moduleId === "snapshots" ? "snapshots" : "records"
      } · ${totalImages} images`;

  return (
    <div className="evidence-package-module">
      <div className="evidence-package-module-header">
        <div className="evidence-package-module-heading">
          <input
            ref={moduleCheckboxRef}
            id={moduleInputId}
            type="checkbox"
            className="evidence-package-checkbox"
            checked={!isEmpty && fullySelected}
            disabled={isEmpty}
            onChange={(event) => onToggleModule(event.target.checked)}
          />
          <label htmlFor={moduleInputId} className="evidence-package-module-label">
            {section.label}
          </label>
        </div>
        <p className="evidence-package-module-summary">{summaryLabel}</p>
        {!isEmpty ? (
          <button
            type="button"
            className="evidence-package-expand-btn"
            aria-expanded={selection.expanded}
            onClick={onToggleExpanded}
          >
            {selection.expanded ? "Hide items" : "Show items"}
          </button>
        ) : null}
      </div>

      {!isEmpty && selection.expanded ? (
        <ul className="evidence-package-item-list">
          {section.items.map((item) => {
            const itemInputId = `evidence-item-${section.moduleId}-${item.id}`;
            return (
              <li key={item.id} className="evidence-package-item">
                <input
                  id={itemInputId}
                  type="checkbox"
                  className="evidence-package-checkbox"
                  checked={Boolean(selection.items[item.id])}
                  onChange={(event) =>
                    onToggleItem(item.id, event.target.checked)
                  }
                />
                <label htmlFor={itemInputId} className="evidence-package-item-label">
                  <span className="evidence-package-item-title">{item.title}</span>
                  <span className="evidence-package-item-detail">{item.detail}</span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!isEmpty && !selection.expanded && selectedCount < section.items.length ? (
        <p className="evidence-package-module-note">
          {selectedCount} of {section.items.length} selected · {selectedImages}{" "}
          images
        </p>
      ) : null}
    </div>
  );
}

type EvidencePackageSelectionProps = {
  sections: EvidenceExportSection[];
  selection: ExportSelectionState;
  onToggleModule: (
    moduleId: EvidenceExportSection["moduleId"],
    checked: boolean
  ) => void;
  onToggleItem: (
    moduleId: EvidenceExportSection["moduleId"],
    itemId: string,
    checked: boolean
  ) => void;
  onToggleExpanded: (moduleId: EvidenceExportSection["moduleId"]) => void;
};

export function EvidencePackageSelection({
  sections,
  selection,
  onToggleModule,
  onToggleItem,
  onToggleExpanded,
}: EvidencePackageSelectionProps) {
  return (
    <div className="evidence-package-modules">
      {sections.map((section) => (
        <EvidenceModuleSection
          key={section.moduleId}
          section={section}
          selection={selection[section.moduleId]}
          onToggleModule={(checked) => onToggleModule(section.moduleId, checked)}
          onToggleItem={(itemId, checked) =>
            onToggleItem(section.moduleId, itemId, checked)
          }
          onToggleExpanded={() => onToggleExpanded(section.moduleId)}
        />
      ))}
    </div>
  );
}
