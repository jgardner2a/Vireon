"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_EVIDENCE_PACKAGE,
  ROUTE_DASHBOARD_MY_HOME,
} from "@/lib/appNavigation";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  getDashboardSnapshot,
  setDashboardSnapshot,
} from "@/lib/dashboard/dashboardSnapshotCache";
import {
  getHomeDashboardMetrics,
  type HomeDashboardMetrics,
} from "@/lib/dashboard/getHomeDashboardMetrics";
import type { Home } from "@/lib/myHome";
import { assertNoDirectHomeQuery } from "@/lib/home/homeContract";
import "./dashboard-home.css";

assertNoDirectHomeQuery();

type HomeFeatureContext = {
  currentHome: Home;
  homes: Home[];
  currentHomeId: string | null;
  metrics: HomeDashboardMetrics | null;
};

type HomeFeature = {
  id: string;
  name: string;
  getSummary: (context: HomeFeatureContext) => string | null;
};

const HOME_FEATURES: HomeFeature[] = [
  {
    id: "gallery",
    name: "Gallery",
    getSummary: (context) =>
      context.metrics?.galleryCount
        ? `${context.metrics.galleryCount} Images`
        : null,
  },
  {
    id: "maintenance",
    name: "Maintenance Logs",
    getSummary: (context) =>
      context.metrics?.maintenanceCount
        ? `${context.metrics.maintenanceCount} Logs`
        : null,
  },
  {
    id: "complex",
    name: "Complex",
    getSummary: (context) =>
      context.metrics?.complexCount
        ? `${context.metrics.complexCount} Issues`
        : null,
  },
  {
    id: "communications",
    name: "Communications",
    getSummary: (context) =>
      context.metrics?.communicationsCount
        ? `${context.metrics.communicationsCount} Communications`
        : null,
  },
  {
    id: "notes",
    name: "Notes",
    getSummary: (context) =>
      context.metrics?.notesCount
        ? `${context.metrics.notesCount} Notes`
        : null,
  },
  { id: "vault", name: "Vault", getSummary: () => null },
];

const FEATURE_NO_CONTENT_STYLE = {
  margin: 0,
  fontWeight: 600,
} as const;

function FeatureSection({
  feature,
  context,
}: {
  feature: HomeFeature;
  context: HomeFeatureContext;
}) {
  const headingId = `feature-${feature.id}-heading`;
  const summary = feature.getSummary(context);

  return (
    <section className="my-home-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="my-home-section-title">
        {feature.name}
      </h2>
      <div className="my-home-card">
        {summary ? (
          <p className="my-home-empty" style={{ margin: 0 }}>
            {summary}
          </p>
        ) : (
          <p className="my-home-empty" style={FEATURE_NO_CONTENT_STYLE}>
            No content
          </p>
        )}
      </div>
    </section>
  );
}

function HomeCardContent({ home }: { home: Home }) {
  const addressLine = home.address.trim();

  return (
    <>
      <p className="my-home-home-name">{home.name}</p>
      <p className="my-home-home-address">
        {addressLine || "No address on file"}
      </p>
    </>
  );
}

function scrollToHashTarget() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    return;
  }

  const id = decodeURIComponent(hash.slice(1));
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function PreviousHomesSection({ homes }: { homes: Home[] }) {
  return (
    <section
      id="previous-homes"
      className="my-home-section"
      aria-labelledby="previous-homes-heading"
    >
      <h2 id="previous-homes-heading" className="my-home-section-title">
        Property History
      </h2>
      {homes.length === 0 ? (
        <div className="my-home-card">
          <p className="my-home-empty" style={{ margin: 0 }}>
            No previous properties
          </p>
        </div>
      ) : (
        homes.map((home) => (
          <div
            key={home.id}
            className="my-home-card"
            style={{ marginBottom: 12 }}
          >
            <HomeCardContent home={home} />
          </div>
        ))
      )}
    </section>
  );
}

export default function DashboardPage() {
  const pathname = usePathname();
  const { state, loading, error: dashboardError, refresh } = useDashboardState();
  const [metrics, setMetrics] = useState<HomeDashboardMetrics | null>(null);

  const homes = state?.homes ?? [];
  const currentHomeId = state?.currentHomeId ?? null;
  const currentHome = state?.currentHome ?? null;
  const previousHomes = homes.filter((home) => home.id !== currentHomeId);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (pathname === ROUTE_DASHBOARD) {
      void refresh();
    }
  }, [pathname, refresh]);

  useEffect(() => {
    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    scrollToHashTarget();
  }, [loading]);

  useEffect(() => {
    if (!state?.userId || !currentHomeId) {
      setMetrics(null);
      return;
    }

    const userId = state.userId;
    const homeId = currentHomeId;

    const snapshot = getDashboardSnapshot(userId, homeId);
    if (snapshot) {
      setMetrics(snapshot.metrics);
    }

    void (async () => {
      const next = await getHomeDashboardMetrics(userId, homeId);
      setMetrics(next);
      setDashboardSnapshot({
        userId,
        homeId,
        metrics: next,
        timestamp: Date.now(),
      });
    })();
  }, [state?.userId, currentHomeId]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <section id="my-home">
          <h1 className="my-home-page-title">Dashboard</h1>
          <p className="my-home-empty">Loading…</p>
        </section>
      </div>
    );
  }

  if (!currentHome) {
    const hasHomes = homes.length > 0;

    return (
      <div className="dashboard-container">
        <section id="my-home">
          <header className="my-home-topbar">
            <h1 className="my-home-page-title">Dashboard</h1>
          </header>
          {dashboardError ? (
            <p className="my-home-error" role="alert">
              {dashboardError}
            </p>
          ) : null}
          <section
            className="my-home-section"
            aria-labelledby="property-workspace-heading"
          >
            <h2
              id="property-workspace-heading"
              className="my-home-section-title"
            >
              Property Workspace
            </h2>
            <div className="my-home-card">
              <p className="my-home-empty" style={{ margin: 0 }}>
                {hasHomes
                  ? "No active property is selected, or your saved property is no longer available. Open My Home and choose a property to continue."
                  : "No active property. Open My Home to add and manage your property workspace."}
              </p>
              <p style={{ margin: "12px 0 0" }}>
                <Link
                  href={ROUTE_DASHBOARD_MY_HOME}
                  className="dashboard-nav-link dashboard-nav-link--active"
                  style={{ display: "inline-block" }}
                >
                  Go to My Home
                </Link>
              </p>
            </div>
          </section>
        </section>

        {hasHomes ? <PreviousHomesSection homes={homes} /> : null}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <section id="my-home">
      <header className="my-home-topbar">
        <h1 className="my-home-page-title">Dashboard</h1>
        <Link
          href={ROUTE_DASHBOARD_EVIDENCE_PACKAGE}
          className="my-home-btn-primary"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          Download Evidence Package
        </Link>
      </header>

      {dashboardError ? (
        <p className="my-home-error" role="alert">
          {dashboardError}
        </p>
      ) : null}

      <section
        className="my-home-section"
        aria-labelledby="current-home-heading"
      >
        <h2 id="current-home-heading" className="my-home-section-title">
          Active Property
        </h2>
        <div
          className="my-home-card"
          style={{ borderColor: "#111", background: "#fafafa" }}
        >
          <HomeCardContent home={currentHome} />
        </div>
      </section>

      {HOME_FEATURES.map((feature) => (
        <FeatureSection
          key={feature.id}
          feature={feature}
          context={{
            currentHome,
            homes,
            currentHomeId,
            metrics,
          }}
        />
      ))}
      </section>

      <PreviousHomesSection homes={previousHomes} />
    </div>
  );
}
