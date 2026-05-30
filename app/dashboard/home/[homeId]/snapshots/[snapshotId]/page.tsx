"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { dashboardSnapshotDetailPath } from "@/lib/appNavigation";

export default function LegacyHomeSnapshotDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const snapshotId =
    typeof params.snapshotId === "string" ? params.snapshotId : "";

  useEffect(() => {
    if (!snapshotId) {
      return;
    }

    router.replace(dashboardSnapshotDetailPath(snapshotId));
  }, [router, snapshotId]);

  return (
    <div className="dashboard-container">
      <p className="dashboard-loading" role="status">
        Redirecting…
      </p>
    </div>
  );
}
