"use client";

import { DashboardAlert } from "@/app/dashboard/_components/DashboardAlert";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlanFeatureGate } from "@/app/dashboard/_components/PlanFeatureGate";
import {
  ROUTE_DASHBOARD_EVIDENCE_PACKAGE,
  ROUTE_DASHBOARD_MY_HOME,
} from "@/lib/appNavigation";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { formatExportDate } from "@/lib/export/formatExportDate";
import { gatherEvidenceInventory } from "@/lib/export/gatherEvidenceInventory";
import {
  computeVaultSummary,
  type VaultSummary,
} from "@/lib/vault/vaultSummary";
import "../dashboard-home.css";
import "./vault.css";

function formatRecordCount(count: number): string {
  return count === 1 ? "1 record" : `${count} records`;
}

function formatImageCount(count: number): string {
  return count === 1 ? "1 image" : `${count} images`;
}

function formatModuleCounts(recordCount: number, imageCount: number): string {
  if (recordCount === 0) {
    return "No records";
  }
  return `${formatRecordCount(recordCount)} · ${formatImageCount(imageCount)}`;
}

export default function VaultPage() {
  return (
    <PlanFeatureGate
      feature="vault"
      title="Vault"
      description="Read-only summary of documented evidence for the active property."
    >
      <VaultPageContent />
    </PlanFeatureGate>
  );
}

function VaultPageContent() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const currentHome = state?.currentHome ?? null;
  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;

  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !homeId) {
      setSummary(null);
      setSummaryError(null);
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);

    void (async () => {
      const result = await gatherEvidenceInventory(userId, homeId);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setSummary(null);
        setSummaryError(result.message);
        setSummaryLoading(false);
        return;
      }

      setSummary(computeVaultSummary(result.inventory));
      setSummaryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, homeId]);

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
        <header className="vault-header">
          <h1 className="dashboard-title">Vault</h1>
          <p className="dashboard-subtitle">
            Read-only summary of documented evidence for the active property.
          </p>
        </header>

        <section className="vault-card" aria-label="No active property">
          <p className="vault-placeholder">
            Select an active property on the dashboard to view its evidence
            summary.
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
      <header className="vault-header">
        <div className="my-home-topbar">
          <h1 className="my-home-page-title">Vault</h1>
          <Link
            href={ROUTE_DASHBOARD_EVIDENCE_PACKAGE}
            className="my-home-btn-primary"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            Download Evidence Package
          </Link>
        </div>
        <p className="dashboard-subtitle">
          Read-only summary of documented evidence for the active property.
        </p>
      </header>

      <section className="vault-section" aria-labelledby="vault-property-heading">
        <h2 id="vault-property-heading" className="vault-section-title">
          Property
        </h2>
        <div className="vault-card">
          <p className="vault-property-name">{currentHome.name}</p>
          <p className="vault-property-address">
            {addressLine || "No address on file"}
          </p>
        </div>
      </section>

      <section
        className="vault-section"
        aria-labelledby="vault-documentation-summary-heading"
      >
        <h2
          id="vault-documentation-summary-heading"
          className="vault-section-title"
        >
          Documentation Summary
        </h2>
        <div className="vault-card">
          {summaryLoading ? (
            <p className="vault-placeholder">Loading documentation summary…</p>
          ) : summaryError ? (
            <DashboardAlert message={summaryError} />
          ) : summary ? (
            <>
              <p className="vault-summary-total">
                {formatRecordCount(summary.totalRecords)} ·{" "}
                {formatImageCount(summary.totalImages)}
              </p>
              <p className="vault-summary-meta">
                {summary.activeModules}{" "}
                {summary.activeModules === 1 ? "category" : "categories"} with
                documentation
                {summary.lastRecordedAt
                  ? ` · Last entry ${formatExportDate(summary.lastRecordedAt)}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="vault-placeholder">No summary available.</p>
          )}
        </div>
      </section>

      <section
        className="vault-section"
        aria-labelledby="vault-evidence-by-category-heading"
      >
        <h2
          id="vault-evidence-by-category-heading"
          className="vault-section-title"
        >
          Evidence by Category
        </h2>
        <div className="vault-card">
          {summaryLoading ? (
            <p className="vault-placeholder">Loading categories…</p>
          ) : summaryError ? null : summary ? (
            <ul className="vault-module-list">
              {summary.modules.map((module) => (
                <li key={module.moduleId} className="vault-module-row">
                  <span className="vault-module-name">{module.title}</span>
                  <span
                    className={
                      module.recordCount === 0
                        ? "vault-module-counts vault-module-empty"
                        : "vault-module-counts"
                    }
                  >
                    {formatModuleCounts(module.recordCount, module.imageCount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
