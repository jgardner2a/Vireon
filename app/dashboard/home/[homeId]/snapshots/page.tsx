"use client";

import { DashboardAlert } from "@/app/dashboard/_components/DashboardAlert";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dashboardSnapshotDetailPath,
  ROUTE_DASHBOARD_MY_HOME,
} from "@/lib/appNavigation";
import { PlanFeatureGate } from "@/app/dashboard/_components/PlanFeatureGate";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  formatSnapshotDate,
  snapshotTypeLabel,
} from "@/lib/snapshots/format";
import { createSnapshot, getSnapshots } from "@/lib/snapshots/snapshots";
import type { Snapshot, SnapshotType } from "@/lib/snapshots/types";

function formatSnapshotListLabel(snapshot: Snapshot): string {
  return `${snapshotTypeLabel(snapshot.type)} — ${formatSnapshotDate(snapshot.created_at)}`;
}

type SnapshotSectionProps = {
  title: string;
  snapshots: Snapshot[];
  createLabel: string;
  busy: boolean;
  creating: boolean;
  onCreate: () => void;
};

function SnapshotSection({
  title,
  snapshots,
  createLabel,
  busy,
  creating,
  onCreate,
}: SnapshotSectionProps) {
  const hasSnapshot = snapshots.length > 0;

  return (
    <section className="dashboard-card" aria-labelledby={`snapshots-${title}`}>
      <h2
        id={`snapshots-${title}`}
        className="dashboard-subtitle"
        style={{ margin: 0, fontWeight: 600, color: "#111" }}
      >
        {title}
      </h2>

      {hasSnapshot ? (
        <ul
          style={{
            listStyle: "none",
            margin: "16px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {snapshots.map((snapshot) => (
            <li key={snapshot.id}>
              <Link
                href={dashboardSnapshotDetailPath(snapshot.id)}
                style={{
                  fontSize: 14,
                  color: "#111",
                  textDecoration: "underline",
                }}
              >
                {formatSnapshotListLabel(snapshot)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          className="dashboard-btn-primary"
          disabled={busy}
          onClick={onCreate}
        >
          {creating ? "Creating…" : createLabel}
        </button>
      )}
    </section>
  );
}

export default function HomeSnapshotsPage() {
  return (
    <PlanFeatureGate
      feature="snapshots"
      title="Snapshots"
      description="Move-in and move-out snapshot records for your property."
    >
      <HomeSnapshotsPageContent />
    </PlanFeatureGate>
  );
}

function HomeSnapshotsPageContent() {
  const params = useParams();
  const router = useRouter();
  const { state, loading: dashboardLoading } = useDashboardState();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<SnapshotType | null>(null);

  const homeId = typeof params.homeId === "string" ? params.homeId : "";

  const home = useMemo(
    () => state?.homes.find((entry) => entry.id === homeId) ?? null,
    [state?.homes, homeId]
  );

  const moveInSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.type === "move_in"),
    [snapshots]
  );

  const moveOutSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.type === "move_out"),
    [snapshots]
  );

  const loadSnapshots = useCallback(async () => {
    if (!homeId || !home) {
      setSnapshots([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setError(null);

    const result = await getSnapshots(homeId);

    if (!result.ok) {
      setError(result.message);
      setSnapshots([]);
      setListLoading(false);
      return;
    }

    setSnapshots(result.snapshots);
    setListLoading(false);
  }, [home, homeId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadSnapshots();
  }, [dashboardLoading, loadSnapshots]);

  const handleCreate = async (type: SnapshotType) => {
    if (!homeId || creatingType) {
      return;
    }

    setCreatingType(type);
    setError(null);

    const result = await createSnapshot(homeId, type);

    if (!result.ok) {
      setError(result.message);
      setCreatingType(null);
      return;
    }

    router.replace(dashboardSnapshotDetailPath(result.snapshot.id));
  };

  if (dashboardLoading || listLoading) {
    return (
      <div className="dashboard-container">
        <p className="dashboard-loading" role="status">
          Loading snapshots…
        </p>
      </div>
    );
  }

  if (!homeId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Snapshots</h1>
        <DashboardAlert message="Invalid property link." />
      </div>
    );
  }

  if (!home) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Snapshots</h1>
        <DashboardAlert message="Property not found or you do not have access." />
        <Link
          href={ROUTE_DASHBOARD_MY_HOME}
          style={{ fontSize: 14, color: "#111" }}
        >
          Back to My Home
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Snapshots</h1>
      <p className="dashboard-subtitle" style={{ marginBottom: 24 }}>
        {home.name}
        {home.address ? ` · ${home.address}` : ""}
      </p>

      {error ? (
        <DashboardAlert message={error} />
      ) : null}

      <SnapshotSection
        title="Move-In"
        snapshots={moveInSnapshots}
        createLabel="Create Move-In Snapshot"
        busy={creatingType !== null}
        creating={creatingType === "move_in"}
        onCreate={() => void handleCreate("move_in")}
      />

      <SnapshotSection
        title="Move-Out"
        snapshots={moveOutSnapshots}
        createLabel="Create Move-Out Snapshot"
        busy={creatingType !== null}
        creating={creatingType === "move_out"}
        onCreate={() => void handleCreate("move_out")}
      />
    </div>
  );
}
