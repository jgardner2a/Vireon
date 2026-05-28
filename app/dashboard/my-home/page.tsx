"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  DOCUMENT_SECTIONS,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/documents/documentConfig";
import {
  fetchDocumentsForHome,
  uploadHomeDocument,
} from "@/lib/documents/documents";
import type { HomeDocument } from "@/lib/documents/types";
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

function isDocumentImage(fileName: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(fileName);
}

function isDocumentPdf(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

function DocumentThumbnail({ doc }: { doc: HomeDocument }) {
  const thumbStyle = {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 6,
    border: "1px solid #ddd",
  } as const;

  if (isDocumentImage(doc.file_name)) {
    return (
      <img
        src={doc.file_url}
        alt=""
        style={{
          ...thumbStyle,
          objectFit: "cover",
        }}
      />
    );
  }

  if (isDocumentPdf(doc.file_name)) {
    return (
      <div
        style={{
          ...thumbStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          fontSize: 11,
          fontWeight: 600,
          color: "#555",
        }}
      >
        PDF
      </div>
    );
  }

  return (
    <div
      style={{
        ...thumbStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontSize: 11,
        fontWeight: 600,
        color: "#555",
      }}
    >
      DOC
    </div>
  );
}

function CurrentPropertyDetails({ home }: { home: Home }) {
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
  const apartmentNumberValue = parsedAddress.apartmentNumber;
  const cityValue = parsedAddress.city;
  const stateValue = parsedAddress.state;
  const zipCodeValue = parsedAddress.zipCode;

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
  const [documents, setDocuments] = useState<HomeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [confirmReplaceDoc, setConfirmReplaceDoc] = useState<{
    type: DocumentType;
    doc: HomeDocument;
  } | null>(null);
  const documentInputRefs = useRef(
    Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, null])) as Record<
      DocumentType,
      HTMLInputElement | null
    >
  );

  const homes = state?.homes ?? [];
  const currentHomeId = state?.currentHomeId ?? null;
  const currentHome = homes.find((home) => home.id === currentHomeId) ?? null;
  const previousHomes = homes.filter((home) => home.id !== currentHomeId);
  const addPropertyLabel = homes.length === 0 ? "Add Property" : "Change Property";
  const displayError = error ?? dashboardError;

  const loadDocuments = useCallback(async () => {
    if (!currentHomeId) {
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);
    const result = await fetchDocumentsForHome(currentHomeId);

    if (!result.ok) {
      setError(result.message);
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    setDocuments(result.documents);
    setDocumentsLoading(false);
  }, [currentHomeId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleDocumentFileChange = async (
    type: DocumentType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file || !currentHomeId) {
      return;
    }

    setUploadingType(type);
    setError(null);

    const result = await uploadHomeDocument({
      homeId: currentHomeId,
      type,
      file,
    });

    if (!result.ok) {
      setUploadingType(null);
      setError(result.message);
      return;
    }

    await loadDocuments();
    setUploadingType(null);
  };

  const handleConfirmReplaceDocument = () => {
    if (!confirmReplaceDoc) {
      return;
    }

    const type = confirmReplaceDoc.type;
    setConfirmReplaceDoc(null);
    documentInputRefs.current[type]?.click();
  };

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
                Current
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
                Current
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
            <h2 className="my-home-section-title" style={{ margin: "0 0 12px" }}>
              Current Property Documents
            </h2>

            {!currentHomeId ? (
              <p className="my-home-empty" style={{ margin: 0 }}>
                Select an active property to manage documents.
              </p>
            ) : documentsLoading ? (
              <p className="my-home-empty" style={{ margin: "0 0 16px" }}>
                Loading documents…
              </p>
            ) : null}

            <div style={{ display: "grid", gap: 12 }}>
              {DOCUMENT_SECTIONS.map((section) => {
                const doc = documents.find((row) => row.type === section.type);
                const hasDocument = !!doc;
                const uploading = uploadingType === section.type;
                const inputId = `document-upload-${section.type}`;

                return (
                  <section
                    key={section.type}
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

                    <input
                      ref={(node) => {
                        documentInputRefs.current[section.type] = node;
                      }}
                      id={inputId}
                      type="file"
                      style={{ display: "none" }}
                      disabled={!currentHomeId || uploading}
                      onChange={(e) => void handleDocumentFileChange(section.type, e)}
                    />

                    {hasDocument ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <DocumentThumbnail doc={doc} />
                          <p
                            className="dashboard-detail-panel__body-text"
                            style={{
                              margin: 0,
                              wordBreak: "break-word",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {doc.file_name}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 8,
                            paddingLeft: 58,
                          }}
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="my-home-btn-secondary"
                            style={{
                              display: "inline-block",
                              textDecoration: "none",
                              padding: "6px 10px",
                              fontSize: 13,
                            }}
                          >
                            View
                          </a>
                          <button
                            type="button"
                            className="my-home-btn-secondary"
                            disabled={
                              !currentHomeId || uploading || documentsLoading
                            }
                            style={{
                              padding: "6px 10px",
                              fontSize: 13,
                            }}
                            onClick={() => setConfirmReplaceDoc({ type: section.type, doc })}
                          >
                            {uploading ? "Uploading…" : "Replace Document"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="my-home-empty" style={{ margin: "0 0 10px" }}>
                          No document uploaded
                        </p>
                        <button
                          type="button"
                          className="my-home-btn-secondary"
                          disabled={
                            !currentHomeId || uploading || documentsLoading
                          }
                          onClick={() =>
                            documentInputRefs.current[section.type]?.click()
                          }
                        >
                          {uploading ? "Uploading…" : "Upload Document"}
                        </button>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {confirmReplaceDoc ? (
        <div
          className="my-home-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmReplaceDoc(null)}
        >
          <div
            className="my-home-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="replace-document-title"
            aria-describedby="replace-document-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="replace-document-title" className="my-home-modal-title">
              Replace Document
            </h2>
            <p id="replace-document-desc" className="dashboard-detail-panel__body-text">
              Are you sure you want to replace this document?
            </p>
            <div className="my-home-modal-actions">
              <button
                type="button"
                className="my-home-btn-secondary"
                onClick={() => setConfirmReplaceDoc(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="my-home-btn-primary"
                onClick={handleConfirmReplaceDocument}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
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
