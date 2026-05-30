"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EvidencePackageSelection } from "@/app/dashboard/evidence-package/EvidencePackageSelection";
import {
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_MY_HOME,
  ROUTE_DASHBOARD_VAULT,
} from "@/lib/appNavigation";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { downloadEvidencePackage } from "@/lib/export/downloadEvidencePackage";
import {
  computeExportPreview,
  createDefaultExportSelection,
  setItemSelection,
  setModuleExpanded,
  setModuleSelection,
} from "@/lib/export/exportSelection";
import { gatherEvidenceInventory } from "@/lib/export/gatherEvidenceInventory";
import type {
  EvidenceInventory,
  EvidenceModuleId,
  ExportProgress,
  ExportSelectionState,
} from "@/lib/export/types";
import { getAuthEmail } from "@/lib/authSession";
import "./evidence-package.css";

function formatRecordCount(count: number): string {
  return count === 1 ? "1 record" : `${count} records`;
}

function formatImageCount(count: number): string {
  return count === 1 ? "1 image" : `${count} images`;
}

export default function EvidencePackagePage() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const currentHome = state?.currentHome ?? null;
  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;

  const [inventory, setInventory] = useState<EvidenceInventory | null>(null);
  const [selection, setSelection] = useState<ExportSelectionState | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null
  );
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !homeId) {
      setInventory(null);
      setSelection(null);
      setInventoryError(null);
      return;
    }

    let cancelled = false;
    setInventoryLoading(true);
    setInventoryError(null);

    void (async () => {
      const result = await gatherEvidenceInventory(userId, homeId);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setInventory(null);
        setSelection(null);
        setInventoryError(result.message);
        setInventoryLoading(false);
        return;
      }

      setInventory(result.inventory);
      setSelection(createDefaultExportSelection(result.inventory));
      setInventoryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, homeId]);

  const preview = useMemo(() => {
    if (!inventory || !selection) {
      return null;
    }
    return computeExportPreview(inventory, selection);
  }, [inventory, selection]);

  const handleToggleModule = useCallback(
    (moduleId: EvidenceModuleId, checked: boolean) => {
      setSelection((current) => {
        if (!inventory || !current) {
          return current;
        }
        const section = inventory.sections.find(
          (entry) => entry.moduleId === moduleId
        );
        if (!section) {
          return current;
        }
        return setModuleSelection(current, moduleId, checked, section);
      });
    },
    [inventory]
  );

  const handleToggleItem = useCallback(
    (moduleId: EvidenceModuleId, itemId: string, checked: boolean) => {
      setSelection((current) => {
        if (!current) {
          return current;
        }
        return setItemSelection(current, moduleId, itemId, checked);
      });
    },
    []
  );

  const handleToggleExpanded = useCallback((moduleId: EvidenceModuleId) => {
    setSelection((current) => {
      if (!current) {
        return current;
      }
      return setModuleExpanded(
        current,
        moduleId,
        !current[moduleId].expanded
      );
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!userId || !homeId || !currentHome || !inventory || !selection) {
      return;
    }
    if (!preview?.hasSelection) {
      return;
    }

    setGenerating(true);
    setExportError(null);
    setExportProgress({ phase: "gathering", message: "Starting export…" });

    const result = await downloadEvidencePackage({
      userId,
      homeId,
      homeName: currentHome.name,
      homeAddress: currentHome.address,
      exporterEmail: getAuthEmail(),
      inventory,
      selection,
      onProgress: setExportProgress,
    });

    if (!result.ok) {
      setExportError(result.message);
    }

    setGenerating(false);
  }, [
    userId,
    homeId,
    currentHome,
    inventory,
    selection,
    preview?.hasSelection,
  ]);

  if (dashboardLoading) {
    return (
      <div className="dashboard-container">
        <p className="dashboard-subtitle">Loading…</p>
      </div>
    );
  }

  if (!currentHome) {
    return (
      <div className="dashboard-container">
        <header className="evidence-package-header">
          <h1 className="dashboard-title">Evidence Package</h1>
          <p className="dashboard-subtitle">
            Download a portable copy of your evidence for this property.
          </p>
        </header>

        <section className="evidence-package-card" aria-label="No active property">
          <p className="evidence-package-preview-placeholder">
            Select an active property on the dashboard before creating an evidence
            package.
          </p>
          <p style={{ margin: "16px 0 0" }}>
            <Link
              href={ROUTE_DASHBOARD_MY_HOME}
              className="dashboard-nav-link dashboard-nav-link--active"
              style={{ display: "inline-block" }}
            >
              Go to My Home
            </Link>
          </p>
        </section>
      </div>
    );
  }

  const addressLine = currentHome.address.trim();

  return (
    <div className="dashboard-container">
      <header className="evidence-package-header">
        <h1 className="dashboard-title">Evidence Package</h1>
        <p className="dashboard-subtitle">
          Everything is included by default. Uncheck modules or individual items to
          omit them from your download.
        </p>
      </header>

      <section
        className="evidence-package-section"
        aria-labelledby="evidence-package-property-heading"
      >
        <h2
          id="evidence-package-property-heading"
          className="evidence-package-section-title"
        >
          Property
        </h2>
        <div className="evidence-package-card">
          <p className="evidence-package-property-name">{currentHome.name}</p>
          <p className="evidence-package-property-address">
            {addressLine || "No address on file"}
          </p>
        </div>
      </section>

      <section
        className="evidence-package-section"
        aria-labelledby="evidence-package-include-heading"
      >
        <h2
          id="evidence-package-include-heading"
          className="evidence-package-section-title"
        >
          Include
        </h2>
        <div className="evidence-package-card evidence-package-card--wide">
          {inventoryLoading ? (
            <p className="evidence-package-preview-placeholder">Loading evidence…</p>
          ) : inventoryError ? (
            <p className="evidence-package-error" role="alert">
              {inventoryError}
            </p>
          ) : inventory && selection ? (
            <EvidencePackageSelection
              sections={inventory.sections}
              selection={selection}
              onToggleModule={handleToggleModule}
              onToggleItem={handleToggleItem}
              onToggleExpanded={handleToggleExpanded}
            />
          ) : (
            <p className="evidence-package-preview-placeholder">
              No evidence data available.
            </p>
          )}
        </div>
      </section>

      <section
        className="evidence-package-section"
        aria-labelledby="evidence-package-preview-heading"
      >
        <h2
          id="evidence-package-preview-heading"
          className="evidence-package-section-title"
        >
          Preview
        </h2>
        <div className="evidence-package-card">
          {preview ? (
            preview.hasSelection ? (
              <>
                <p className="evidence-package-preview-summary">
                  Export {formatRecordCount(preview.recordCount)} and{" "}
                  {formatImageCount(preview.imageCount)}.
                </p>
                <ul className="evidence-package-preview-list">
                  {preview.modules
                    .filter((module) => module.totalRecords > 0)
                    .map((module) => (
                      <li key={module.moduleId}>
                        {module.label}: {module.selectedRecords} of{" "}
                        {module.totalRecords} selected · {module.selectedImages}{" "}
                        images
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p className="evidence-package-preview-placeholder">
                Select at least one item to export.
              </p>
            )
          ) : (
            <p className="evidence-package-preview-placeholder">
              Preview will appear once evidence is loaded.
            </p>
          )}
        </div>
      </section>

      <div className="evidence-package-actions">
        {exportError ? (
          <p className="evidence-package-error" role="alert">
            {exportError}
          </p>
        ) : null}
        {generating && exportProgress ? (
          <p className="evidence-package-progress" aria-live="polite">
            {exportProgress.message}
          </p>
        ) : null}
        <button
          type="button"
          className="dashboard-btn-primary"
          disabled={!preview?.hasSelection || generating || inventoryLoading}
          onClick={() => void handleGenerate()}
        >
          {generating ? "Generating…" : "Generate & download"}
        </button>
        <Link href={ROUTE_DASHBOARD_VAULT} className="evidence-package-back-link">
          Back to Vault
        </Link>
        <Link href={ROUTE_DASHBOARD} className="evidence-package-back-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
