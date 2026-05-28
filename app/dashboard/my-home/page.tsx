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

const MY_HOME_SPLIT_WORKSPACE = {
  minHeight: "140vh",
  alignItems: "stretch",
} as const;

const MY_HOME_SPLIT_COLUMN = {
  minHeight: "100%",
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
} as const;

const MY_HOME_SPLIT_PANEL = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
} as const;

const DOCUMENT_CATEGORY_SECTIONS = [
  {
    title: "Lease Agreement",
    subtitle: "Primary lease document used for residency verification.",
  },
  {
    title: "Lease Addendums",
    subtitle: "Supplemental lease terms, amendments, and special clauses.",
  },
  {
    title: "Move-In Inspection",
    subtitle: "Condition report completed at the start of tenancy.",
  },
  {
    title: "Move-Out Inspection",
    subtitle: "Final condition report completed before move-out.",
  },
  {
    title: "Renters Insurance",
    subtitle: "Proof of active renters insurance coverage.",
  },
  {
    title: "HOA / Community Rules",
    subtitle: "Building or community rules and policy documents.",
  },
  {
    title: "Parking Agreement",
    subtitle: "Assigned parking terms, permits, and garage details.",
  },
  {
    title: "Pet Agreement",
    subtitle: "Pet policies, approvals, and related lease documentation.",
  },
  {
    title: "Other Documents",
    subtitle: "Additional records that do not fit predefined categories.",
  },
] as const;

const MY_HOME_HEADER_LEFT_PANEL = {
  width: "calc(100% - clamp(280px, 37.5%, 36rem))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
} as const;

function HomeCardContent({ home }: { home: Home }) {
  return (
    <>
      <p className="my-home-home-name">{home.name}</p>
      <p className="my-home-home-address">{home.address}</p>
    </>
  );
}

function CurrentPropertyDetails({ home }: { home: Home }) {
  const homeWithDetails = home as Home & {
    apartment_number?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };

  const parseAddressParts = (rawAddress: string) => {
    const segments = rawAddress
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const streetAddress = segments[0] ?? "";
    const unitSegment =
      segments.find((part) => /^apt\s+/i.test(part)) ||
      segments.find((part) => /^unit\s+/i.test(part)) ||
      "";
    const apartmentNumber = unitSegment
      .replace(/^apt\.?\s*/i, "")
      .replace(/^unit\s*/i, "")
      .trim();

    const citySegment = segments[2] ?? "";
    const stateZipSegment = segments[3] ?? "";
    const stateZipMatch = stateZipSegment.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);

    const stateSegment = stateZipMatch?.[1] ?? "";
    const zipSegment = (segments[4] ?? stateZipMatch?.[2] ?? "").trim();

    return {
      streetAddress,
      apartmentNumber,
      city: citySegment,
      state: stateSegment,
      zipCode: zipSegment,
    };
  };

  const parsedAddress = parseAddressParts(home.address);
  const apartmentNumberValue =
    homeWithDetails.apartment_number?.trim() || parsedAddress.apartmentNumber;
  const cityValue = homeWithDetails.city?.trim() || parsedAddress.city;
  const stateValue = homeWithDetails.state?.trim() || parsedAddress.state;
  const zipCodeValue = homeWithDetails.zip?.trim() || parsedAddress.zipCode;

  const rows = [
    { label: "Apartment Name", value: home.name },
    { label: "Address", value: parsedAddress.streetAddress || home.address },
    { label: "Apartment Number", value: apartmentNumberValue || "-" },
    { label: "City", value: cityValue || "-" },
    { label: "State", value: stateValue || "-" },
    { label: "Zip Code", value: zipCodeValue || "-" },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map((row, index) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 180px) 1fr",
            gap: 12,
            alignItems: "start",
            paddingTop: index === 0 ? 0 : 10,
            borderTop: index === 0 ? "none" : "1px solid #ececec",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#444",
            }}
          >
            {row.label}
          </span>
          <span
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "#222",
              wordBreak: "break-word",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MyHomePage() {
  const { state, error: dashboardError, refresh } = useDashboardState();
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [switchingHomeId, setSwitchingHomeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument] = useState<{
    id: string;
    title: string;
    type: string;
  } | null>(null);
  const [sidebarMode] = useState<"view" | "edit">("view");

  const homes = state?.homes ?? [];
  const currentHomeId = state?.currentHomeId ?? null;
  const currentHome = homes.find((home) => home.id === currentHomeId) ?? null;
  const previousHomes = homes.filter((home) => home.id !== currentHomeId);
  const addPropertyLabel = homes.length === 0 ? "Add Property" : "Change Property";
  const displayError = error ?? dashboardError;
  const documents: Array<{ id: string; title: string; type: string }> = [];

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
    <div className="dashboard-container dashboard-container--split">
      <header className="my-home-topbar">
        <div style={MY_HOME_HEADER_LEFT_PANEL}>
          <div>
            <h1 className="dashboard-title">My Home</h1>
            <p className="dashboard-subtitle">
              Store and review home documents in one place.
            </p>
          </div>
          <button
            type="button"
            className="my-home-btn-primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setError(null);
              setShowAddHomeModal(true);
            }}
          >
            {addPropertyLabel}
          </button>
        </div>
      </header>

      {displayError ? (
        <p className="my-home-error" role="alert">
          {displayError}
        </p>
      ) : null}

      <div className="dashboard-split" style={MY_HOME_SPLIT_WORKSPACE}>
        <div className="dashboard-split__list" style={MY_HOME_SPLIT_COLUMN}>
          {currentHome ? (
            <section
              className="my-home-section"
              aria-labelledby="current-home-heading"
              style={{ ...MY_HOME_SPLIT_PANEL, flex: "0 0 auto", marginBottom: 100 }}
            >
              <h2 id="current-home-heading" className="my-home-section-title">
                Current Property
              </h2>
              <div
                className="my-home-card"
                style={{
                  borderColor: "#111",
                  background: "#fafafa",
                }}
              >
                <CurrentPropertyDetails home={currentHome} />
              </div>
            </section>
          ) : (
            <section
              className="my-home-section"
              aria-labelledby="no-home-heading"
              style={{ ...MY_HOME_SPLIT_PANEL, flex: "0 0 auto", marginBottom: 100 }}
            >
              <h2 id="no-home-heading" className="my-home-section-title">
                Current Property
              </h2>
              <div className="my-home-card">
                <p className="my-home-empty" style={{ margin: 0 }}>
                  Add a property to start using your workspace features.
                </p>
              </div>
            </section>
          )}

          <section
            id="previous-homes"
            className="my-home-section"
            aria-labelledby="previous-homes-heading"
          >
            <h2 id="previous-homes-heading" className="my-home-section-title">
              Previous Properties
            </h2>
            {previousHomes.length === 0 ? (
              <div className="my-home-card">
                <p className="my-home-empty" style={{ margin: 0 }}>
                  No previous properties yet
                </p>
              </div>
            ) : (
              previousHomes.map((home) => (
                <div key={home.id} className="my-home-card" style={{ marginBottom: 12 }}>
                  <HomeCardContent home={home} />
                  <div className="my-home-modal-actions" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="my-home-btn-secondary"
                      onClick={() => void handleSwitchActiveHome(home.id)}
                      disabled={switchingHomeId === home.id}
                    >
                      {switchingHomeId === home.id ? "Switching..." : "Set Active"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <aside
          className="dashboard-split__detail"
          aria-label="Documents"
          style={MY_HOME_SPLIT_COLUMN}
        >
          <div className="dashboard-detail-panel" style={MY_HOME_SPLIT_PANEL}>
            <div className="my-home-topbar" style={{ marginBottom: 12 }}>
              <h2 className="my-home-section-title" style={{ margin: 0 }}>
                Documents
              </h2>
              <button
                type="button"
                className="dashboard-btn-primary"
                disabled
                aria-disabled="true"
              >
                Add Document
              </button>
            </div>

            <p className="dashboard-detail-panel__empty" style={{ padding: "0 0 12px" }}>
              No document selected.
            </p>
            <p className="dashboard-detail-panel__body-text" style={{ marginBottom: 16 }}>
              Organize property records by category. Upload and management actions
              will be added in a future step.
            </p>
            <p className="dashboard-detail-panel__body-text" style={{ marginBottom: 16 }}>
              {sidebarMode === "view" && !selectedDocument
                ? `${documents.length} documents in this workspace.`
                : "Document details view placeholder."}
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {DOCUMENT_CATEGORY_SECTIONS.map((section) => (
                <section
                  key={section.title}
                  className="my-home-card"
                  style={{ margin: 0, padding: 12, borderColor: "#ececec" }}
                >
                  <h3
                    className="dashboard-detail-panel__section-title"
                    style={{ marginBottom: 6 }}
                  >
                    {section.title}
                  </h3>
                  <p
                    className="dashboard-detail-panel__body-text"
                    style={{ marginBottom: 8, color: "#555" }}
                  >
                    {section.subtitle}
                  </p>
                  <p className="my-home-empty" style={{ margin: 0 }}>
                    No document uploaded
                  </p>
                </section>
              ))}
            </div>
          </div>
        </aside>
      </div>

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
