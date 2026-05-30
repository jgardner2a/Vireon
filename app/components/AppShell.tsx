"use client";

import { DashboardProvider } from "@/lib/dashboard/dashboardContext";
import { AppLayout } from "./layout/AppLayout";
import { GlobalHeader } from "./GlobalHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <GlobalHeader />
      <AppLayout>{children}</AppLayout>
    </DashboardProvider>
  );
}
