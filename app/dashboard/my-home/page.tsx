"use client";

import { useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  createAndActivateHome,
  switchActiveHome,
  type Home,
} from "@/lib/myHome";
import { assertNoDirectHomeQuery } from "@/lib/home/homeContract";
import "../dashboard-home.css";

assertNoDirectHomeQuery();

const EMPTY_FORM = {
  apartmentName: "",
  address: "",
  apartmentNumber: "",
  city: "",
  state: "",
  zipCode: "",
};

function HomeCardContent({ home }: { home: Home }) {
  return (
    <>
      <p className="my-home-home-name">{home.name}</p>
      <p className="my-home-home-address">{home.address}</p>
    </>
  );
}

function PreviousHomesSection({
  homes,
  switchingHomeId,
  onSwitch,
}: {
  homes: Home[];
  switchingHomeId: string | null;
  onSwitch: (homeId: string) => Promise<void>;
}) {
  return (
    <section
      id="previous-homes"
      className="my-home-section"
      aria-labelledby="previous-homes-heading"
    >
      <h2 id="previous-homes-heading" className="my-home-section-title">
        Previous Homes
      </h2>
      {homes.length === 0 ? (
        <div className="my-home-card">
          <p className="my-home-empty" style={{ margin: 0 }}>
            No previous properties yet
          </p>
        </div>
      ) : (
        homes.map((home) => (
          <div key={home.id} className="my-home-card" style={{ marginBottom: 12 }}>
            <HomeCardContent home={home} />
            <div className="my-home-modal-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="my-home-btn-secondary"
                onClick={() => void onSwitch(home.id)}
                disabled={switchingHomeId === home.id}
              >
                {switchingHomeId === home.id ? "Switching..." : "Set Active"}
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export default function MyHomePage() {
  const { state, loading, error: dashboardError, refresh } = useDashboardState();
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [switchingHomeId, setSwitchingHomeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const homes = state?.homes ?? [];
  const currentHomeId = state?.currentHomeId ?? null;
  const currentHome = homes.find((home) => home.id === currentHomeId) ?? null;
  const previousHomes = homes.filter((home) => home.id !== currentHomeId);
  const addPropertyLabel =
    homes.length === 0 ? "Add Property" : "Change Property";
  const displayError = error ?? dashboardError;

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createAndActivateHome({
      name: form.apartmentName,
      address: form.address,
      apartmentNumber: form.apartmentNumber,
      city: form.city,
      state: form.state,
      zip: form.zipCode,
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }

    await refresh();
    setSaving(false);
    setShowAddHomeModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSwitchActiveHome = async (homeId: string) => {
    setSwitchingHomeId(homeId);
    setError(null);

    const switched = await switchActiveHome(homeId);
    if (!switched.ok) {
      setSwitchingHomeId(null);
      setError(switched.message);
      return;
    }

    await refresh();
    setSwitchingHomeId(null);
  };

  return (
    <div className="dashboard-container">
      <section id="my-home">
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
            disabled={loading}
          >
            {addPropertyLabel}
          </button>
        </header>

        <p className="my-home-empty" style={{ marginBottom: 16 }}>
          Manage your property and documents
        </p>

        {displayError ? (
          <p className="my-home-error" role="alert">
            {displayError}
          </p>
        ) : null}

        {currentHome ? (
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
        ) : (
          <section className="my-home-section" aria-labelledby="no-home-heading">
            <h2 id="no-home-heading" className="my-home-section-title">
              No Active Property
            </h2>
            <div className="my-home-card">
              <p className="my-home-empty" style={{ margin: 0 }}>
                Add a property to start using your workspace features.
              </p>
            </div>
          </section>
        )}
      </section>

      <PreviousHomesSection
        homes={previousHomes}
        switchingHomeId={switchingHomeId}
        onSwitch={handleSwitchActiveHome}
      />

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
              Add a property
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
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
                    setForm((f) => ({ ...f, apartmentNumber: e.target.value }))
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
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="my-home-field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                  disabled={saving}
                />
              </div>

              {displayError ? (
                <p className="my-home-error" role="alert">
                  {displayError}
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
