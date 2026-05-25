"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";
import {
  createHome,
  getGalleryFileCount,
  getHomeData,
  setCurrentHome as activateHome,
  type Home,
} from "@/lib/myHome";
import { assertNoDirectHomeQuery } from "@/lib/home/homeContract";
import "./my-home.css";

assertNoDirectHomeQuery();

const EMPTY_FORM = {
  apartmentName: "",
  address: "",
  apartmentNumber: "",
  city: "",
  state: "",
  zipCode: "",
};

/** Snapshot context from fetchMyHomeData — extend getSummary when new fields exist. */
type HomeFeatureContext = {
  currentHome: Home;
  previousHomes: Home[];
  homes: Home[];
  currentHomeId: string | null;
  gallerySummary: string | null;
};

type HomeFeature = {
  id: string;
  name: string;
  getSummary: (context: HomeFeatureContext) => string | null;
};

const HOME_FEATURES: HomeFeature[] = [
  { id: "gallery", name: "Gallery", getSummary: (context) => context.gallerySummary },
  { id: "issues", name: "Issues", getSummary: () => null },
  { id: "notes", name: "Notes", getSummary: () => null },
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
  return (
    <>
      <p className="my-home-home-name">{home.name}</p>
      <p className="my-home-home-address">{home.address}</p>
    </>
  );
}

export default function MyHomePage() {
  const [currentHome, setCurrentHome] = useState<Home | null>(null);
  const [previousHomes, setPreviousHomes] = useState<Home[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [currentHomeId, setCurrentHomeId] = useState<string | null>(null);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [summaryHome, setSummaryHome] = useState<Home | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallerySummary, setGallerySummary] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getHomeData();

    if (!result.ok) {
      setError(result.message);
      setCurrentHome(null);
      setPreviousHomes([]);
      setHomes([]);
      setCurrentHomeId(null);
      setGallerySummary(null);
    } else {
      setCurrentHome(result.data.currentHome);
      setPreviousHomes(result.data.previousHomes);
      setHomes(result.data.homes);
      setCurrentHomeId(result.data.currentHomeId);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!currentHomeId) {
      setGallerySummary(null);
      return;
    }

    void (async () => {
      const userId = await getCurrentUserId();
      if (!userId) {
        setGallerySummary(null);
        return;
      }

      const fileCount = await getGalleryFileCount(userId, currentHomeId);
      setGallerySummary(fileCount > 0 ? `${fileCount} Images` : null);
    })();
  }, [currentHomeId]);

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const created = await createHome({
      name: form.apartmentName,
      address: form.address,
      apartmentNumber: form.apartmentNumber,
      city: form.city,
      state: form.state,
      zip: form.zipCode,
    });

    if (!created.ok) {
      setSaving(false);
      setError(created.message);
      return;
    }

    const activated = await activateHome(created.createdHome.id);

    if (!activated.ok) {
      setSaving(false);
      setError(activated.message);
      return;
    }

    await loadData();
    setSaving(false);
    setShowAddHomeModal(false);
    setForm(EMPTY_FORM);
  };

  const modalOpen = showAddHomeModal || summaryHome !== null;

  if (loading) {
    return (
      <div className="dashboard-container">
        <h1 className="my-home-page-title">My Home</h1>
        <p className="my-home-empty">Loading…</p>
      </div>
    );
  }

  if (!currentHome) {
    return (
      <div className="dashboard-container">
        <header className="my-home-topbar">
          <h1 className="my-home-page-title">My Home</h1>
          <button
            type="button"
            className="my-home-btn-primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setError(null);
              setShowAddHomeModal(true);
            }}
          >
            Add Home
          </button>
        </header>

        {error && !modalOpen ? (
          <p className="my-home-error" role="alert">
            {error}
          </p>
        ) : null}

        {showAddHomeModal ? (
          <div
            className="my-home-modal-backdrop"
            role="presentation"
            onClick={() => {
              setShowAddHomeModal(false);
              setForm(EMPTY_FORM);
            }}
          >
            <div
              className="my-home-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-home-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="add-home-modal-title" className="my-home-modal-title">
                Add a home
              </h2>
              <form className="my-home-form" onSubmit={handleCreateHome}>
                <div className="my-home-field">
                  <label htmlFor="apartment-name">Apartment Name</label>
                  <input
                    id="apartment-name"
                    type="text"
                    value={form.apartmentName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, apartmentName: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="my-home-field">
                  <label htmlFor="address">Address</label>
                  <input
                    id="address"
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="my-home-field">
                  <label htmlFor="apartment-number">Apartment Number</label>
                  <input
                    id="apartment-number"
                    type="text"
                    value={form.apartmentNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        apartmentNumber: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="my-home-form-row">
                  <div className="my-home-field">
                    <label htmlFor="city">City</label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, city: e.target.value }))
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="my-home-field">
                    <label htmlFor="state">State</label>
                    <input
                      id="state"
                      type="text"
                      value={form.state}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, state: e.target.value }))
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="my-home-field">
                  <label htmlFor="zip">Zip Code</label>
                  <input
                    id="zip"
                    type="text"
                    value={form.zipCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zipCode: e.target.value }))
                    }
                    disabled={saving}
                  />
                </div>

                {error ? (
                  <p className="my-home-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="my-home-modal-actions">
                  <button
                    type="button"
                    className="my-home-btn-secondary"
                    onClick={() => {
                      setShowAddHomeModal(false);
                      setForm(EMPTY_FORM);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="my-home-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="my-home-topbar">
        <h1 className="my-home-page-title">My Home</h1>
      </header>

      {error && !modalOpen ? (
        <p className="my-home-error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="my-home-section"
        aria-labelledby="current-home-heading"
      >
        <h2 id="current-home-heading" className="my-home-section-title">
          Current Home
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
            previousHomes,
            homes,
            currentHomeId,
            gallerySummary,
          }}
        />
      ))}

      <section
        className="my-home-section"
        aria-labelledby="previous-homes-heading"
      >
        <h2 id="previous-homes-heading" className="my-home-section-title">
          Previous Homes
        </h2>
        {previousHomes.length === 0 ? (
          <div className="my-home-card">
            <p className="my-home-empty">No previous homes</p>
          </div>
        ) : (
          <ul className="my-home-list" aria-label="Previous homes">
            {previousHomes.map((home) => (
              <li key={home.id}>
                <button
                  type="button"
                  className="my-home-card"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                  onClick={() => setSummaryHome(home)}
                >
                  <HomeCardContent home={home} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summaryHome ? (
        <div
          className="my-home-modal-backdrop"
          role="presentation"
          onClick={() => setSummaryHome(null)}
        >
          <div
            className="my-home-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="previous-home-summary-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="previous-home-summary-title" className="my-home-modal-title">
              Previous home
            </h2>
            <div className="my-home-card">
              <HomeCardContent home={summaryHome} />
            </div>
            <div className="my-home-modal-actions">
              <button
                type="button"
                className="my-home-btn-primary"
                onClick={() => setSummaryHome(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
