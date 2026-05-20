"use client";

import { VireonAppShell } from "@/app/components/VireonAppShell";
import { PlacesSidebarFooter } from "./PlacesSidebarFooter";
import { PlacesWorkspaceSidebar } from "./PlacesWorkspaceSidebar";
import "../my-home/my-home.css";
import "./places-shell.css";

export default function PlacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VireonAppShell
      sidebarContent={<PlacesWorkspaceSidebar />}
      mainClassName="places-shell-main"
      fullBleedMain
      sidebarFooter={<PlacesSidebarFooter />}
    >
      {children}
    </VireonAppShell>
  );
}
