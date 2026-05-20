"use client";

import { useState } from "react";
import { UpgradeModal } from "../components/UpgradeModal";
import { getProfileId } from "@/lib/data/profile";
import {
  requestFullExportUpgradeCheck,
  resolveVaultExportScope,
  triggerExportDownload,
} from "@/lib/export/client";
import { hasFullVaultAccess } from "@/lib/permissions";
import { getSubscriptionPlan, type UserPlan } from "@/lib/subscription/subscription";
import type { PropertyResidenceStatus } from "@/lib/property/residenceStatus";
import type { ExportScope } from "@/lib/export/types";

type VaultExportBarProps = {
  filterPropertyId: string;
  properties: Array<{ id: string; name: string; residenceStatus?: PropertyResidenceStatus }>;
  plan: UserPlan | null;
  planReady: boolean;
};

export function VaultExportBar({
  filterPropertyId,
  properties,
  plan,
  planReady,
}: VaultExportBarProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [lastProfile, setLastProfile] = useState<string | null>(null);

  const showProCopy = planReady && plan !== null && hasFullVaultAccess(plan);
  const showFreeCopy = planReady && plan !== null && !hasFullVaultAccess(plan);

  async function resolveExportScopeFresh(): Promise<ExportScope | null> {
    const profileId = getProfileId();
    if (!profileId) return null;
    const freshPlan = await getSubscriptionPlan(profileId);
    return resolveVaultExportScope(freshPlan, filterPropertyId, properties);
  }

  const handleExport = async () => {
    setError(null);
    let scope: ExportScope | null;
    try {
      scope = await resolveExportScopeFresh();
    } catch {
      setError("Could not verify your subscription plan. Try again.");
      return;
    }
    if (!scope) {
      setError("Add a property before exporting evidence.");
      return;
    }

    setExporting(true);
    const result = await triggerExportDownload({ scope });
    setExporting(false);

    if (!result.ok) {
      if (result.upgradeRequired) {
        setUpgradeOpen(true);
        return;
      }
      setError(result.message);
      return;
    }

    setLastProfile(result.profile);
  };

  const handleUpgradePrompt = async () => {
    let scope: ExportScope | null;
    try {
      scope = await resolveExportScopeFresh();
    } catch {
      setUpgradeOpen(true);
      return;
    }
    if (!scope) {
      setUpgradeOpen(true);
      return;
    }
    const result = await requestFullExportUpgradeCheck(scope);
    setUpgradeOpen(true);
    if (result.ok) {
      setError(null);
    }
  };

  return (
    <>
      <div className="vault-export-bar" style={{ marginTop: 24, marginBottom: 28 }}>
        <div className="vault-export-bar-inner">
          <div>
            <p className="vault-export-bar__title">Export Evidence Package</p>
            <p className="my-home-text-muted" style={{ marginTop: 4 }}>
              {showProCopy
                ? "Your Pro plan includes the full evidence package (manifest, graph, timeline, and media)."
                : showFreeCopy
                  ? "Downloads a basic snapshot. Upgrade to Pro for the full evidence package."
                  : "Loading plan details…"}
            </p>
            {lastProfile ? (
              <p className="my-home-text-muted" style={{ marginTop: 8, fontSize: 13 }}>
                Last export tier: {lastProfile === "FULL_PACKAGE" ? "Full package" : "Basic snapshot"} (assigned by server)
              </p>
            ) : null}
          </div>
          <div className="vault-export-bar__actions">
            <button
              type="button"
              className="my-home-btn-primary"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {exporting ? "Exporting…" : "Export Evidence Package"}
            </button>
            {showFreeCopy ? (
              <button
                type="button"
                className="my-home-btn-secondary"
                onClick={() => void handleUpgradePrompt()}
              >
                Full package (Pro)
              </button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="my-home-form-error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        ) : null}
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
