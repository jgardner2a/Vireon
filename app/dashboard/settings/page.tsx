"use client";

import { useMemo } from "react";
import { AccountSection } from "./AccountSection";
import { DataPrivacySection } from "./DataPrivacySection";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { PlanSection } from "./PlanSection";
import { SecuritySection } from "./SecuritySection";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { useAuthSession } from "@/lib/useAuthSession";
import "./settings.css";

export default function SettingsPage() {
  const { isLoading: sessionLoading } = useAuthSession();
  const { state, loading: dashboardLoading, refresh } = useDashboardState();

  const userId = state?.userId ?? null;
  const homes = useMemo(() => state?.homes ?? [], [state?.homes]);
  const dataLoading = sessionLoading || dashboardLoading;

  return (
    <div className="dashboard-container">
      <header className="settings-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">
          Manage your account, plan, security, and data preferences.
        </p>
      </header>

      <AccountSection sessionLoading={sessionLoading} />
      <PlanSection loading={dataLoading} plan={state?.plan ?? null} />
      <SecuritySection />
      <DataPrivacySection
        userId={userId}
        homes={homes}
        loading={dataLoading}
        onPropertyDeleted={refresh}
      />
      <DeleteAccountSection />
    </div>
  );
}
