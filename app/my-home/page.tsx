"use client";

import { PropertyHomesPanel } from "./components/PropertyHomesPanel";
import { usePropertyContext } from "./hooks/usePropertyContext";

export default function MyHomeDashboardPage() {
  const { status, currentProperty } = usePropertyContext();

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">My Home</h1>
          <p className="my-home-subtitle">
            {currentProperty
              ? `Active home: ${currentProperty.name}`
              : "Your workspace is scoped to your current property membership."}
          </p>
        </div>
      </header>

      <PropertyHomesPanel />

      {status === "ready" ? (
        <p className="my-home-text-muted" style={{ marginTop: 16 }}>
          Future modules (Issues, Gallery, Vault) will use this current property
          context. Access is enforced via property_members.
        </p>
      ) : null}
    </>
  );
}
