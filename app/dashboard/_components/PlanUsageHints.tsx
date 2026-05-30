"use client";

import { useEffect, useState } from "react";
import {
  formatStorageBytes,
  getPlanLimits,
  getPlanStorageLimitBytes,
  getStorageUsagePercent,
} from "@/lib/billing/planConfig";
import { countEvidenceLogsForHome } from "@/lib/billing/planEnforcement";
import type { PlanTier } from "@/lib/billing/types";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import "./plan-usage-hints.css";

type PlanUsageHintsProps = {
  /** full: storage + evidence logs; logs-only: evidence logs; storage-only: upload storage */
  variant?: "full" | "logs-only" | "storage-only";
  /** Bumps evidence log count refresh (e.g. logs.length after create/delete). */
  refreshToken?: number;
};

export function PlanUsageHints({
  variant = "full",
  refreshToken = 0,
}: PlanUsageHintsProps) {
  const { state, loading } = useDashboardState();
  const [evidenceLogCount, setEvidenceLogCount] = useState<number | null>(null);

  const plan: PlanTier = state?.plan ?? "free";
  const limits = getPlanLimits(plan);
  const showStorage = variant === "full" || variant === "storage-only";
  const showEvidenceLogs =
    (variant === "full" || variant === "logs-only") &&
    limits.maxEvidenceLogsPerHome !== null;

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;

  useEffect(() => {
    if (!showEvidenceLogs || !userId || !homeId) {
      setEvidenceLogCount(null);
      return;
    }

    let cancelled = false;

    void countEvidenceLogsForHome(userId, homeId).then((count) => {
      if (!cancelled) {
        setEvidenceLogCount(count);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showEvidenceLogs, userId, homeId, refreshToken]);

  if (loading || !state) {
    return null;
  }

  if (!showStorage && !showEvidenceLogs) {
    return null;
  }

  const storageLimitBytes = getPlanStorageLimitBytes(plan);
  const storageUsedBytes = state.storageBytesUsed;
  const storagePercent = getStorageUsagePercent(
    storageUsedBytes,
    storageLimitBytes
  );
  const storageAtLimit = storageUsedBytes >= storageLimitBytes;

  const logLimit = limits.maxEvidenceLogsPerHome;
  const logsAtLimit =
    logLimit !== null &&
    evidenceLogCount !== null &&
    evidenceLogCount >= logLimit;

  return (
    <section
      className="plan-usage-hints"
      aria-label="Plan usage"
      data-variant={variant}
    >
      {showStorage ? (
        <div className="plan-usage-hints__block">
          <div className="plan-usage-hints__header">
            <span className="plan-usage-hints__label">Upload storage</span>
            <span className="plan-usage-hints__summary">
              {formatStorageBytes(storageUsedBytes)} of{" "}
              {formatStorageBytes(storageLimitBytes)}
            </span>
          </div>
          <div
            className="plan-usage-hints__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={storagePercent}
            aria-label={`Upload storage used: ${storagePercent}%`}
          >
            <div
              className={
                storageAtLimit
                  ? "plan-usage-hints__fill plan-usage-hints__fill--at-limit"
                  : "plan-usage-hints__fill"
              }
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="plan-usage-hints__hint">
            {limits.storageIncludesDocumentsBucket
              ? "Gallery, evidence uploads, and My Home documents share this limit."
              : "Gallery and evidence uploads count toward this limit. My Home documents are excluded on Free."}
          </p>
        </div>
      ) : null}

      {showEvidenceLogs && logLimit !== null ? (
        <p
          className={
            logsAtLimit
              ? "plan-usage-hints__logs plan-usage-hints__logs--at-limit"
              : "plan-usage-hints__logs"
          }
        >
          Evidence logs on this property:{" "}
          {evidenceLogCount === null
            ? "…"
            : `${evidenceLogCount} of ${logLimit}`}{" "}
          (Maintenance, Complex, Communications, and Notes combined)
        </p>
      ) : null}
    </section>
  );
}
