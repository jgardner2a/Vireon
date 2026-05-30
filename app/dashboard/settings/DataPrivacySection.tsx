"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  gatherUserDataSummary,
  type PropertyDataSummary,
  type UserDataSummary,
} from "@/lib/account/gatherUserDataSummary";
import { deleteHomeAndAllData } from "@/lib/home/deleteHome";
import type { Home } from "@/lib/home/homeMapper";
import {
  ROUTE_ACCOUNT_DELETION,
  ROUTE_DASHBOARD_EVIDENCE_PACKAGE,
  ROUTE_PRIVACY,
  ROUTE_TERMS,
} from "@/lib/appNavigation";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/config";
import { DeletePropertyDialog } from "./DeletePropertyDialog";

type DataPrivacySectionProps = {
  userId: string | null;
  homes: Home[];
  loading: boolean;
  onPropertyDeleted: () => Promise<void>;
};

function formatRecordCount(count: number): string {
  return count === 1 ? "1 record" : `${count} records`;
}

function formatImageCount(count: number): string {
  return count === 1 ? "1 image" : `${count} images`;
}

function formatDocumentCount(count: number): string {
  return count === 1 ? "1 document" : `${count} documents`;
}

function formatPropertyCount(count: number): string {
  return count === 1 ? "1 property" : `${count} properties`;
}

function formatPropertySummary(property: PropertyDataSummary): string {
  const parts = [formatRecordCount(property.totalRecords)];

  if (property.totalImages > 0) {
    parts.push(formatImageCount(property.totalImages));
  }

  if (property.documentCount > 0) {
    parts.push(formatDocumentCount(property.documentCount));
  }

  return parts.join(" · ");
}

export function DataPrivacySection({
  userId,
  homes,
  loading,
  onPropertyDeleted,
}: DataPrivacySectionProps) {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UserDataSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertyDataSummary | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (loading || !userId) {
      setSummary(null);
      setSummaryError(null);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    const result = await gatherUserDataSummary(userId, homes);
    if (!result.ok) {
      setSummary(null);
      setSummaryError(result.message);
      setSummaryLoading(false);
      return;
    }

    setSummary(result.summary);
    setSummaryLoading(false);
  }, [userId, homes, loading]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleOpenDelete = (property: PropertyDataSummary) => {
    setDeleteTarget(property);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    if (deletingProperty) {
      return;
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !deleteTarget) {
      return;
    }

    setDeletingProperty(true);
    setDeleteError(null);

    const remainingHomeIds = homes
      .map((home) => home.id)
      .filter((homeId) => homeId !== deleteTarget.homeId);

    const result = await deleteHomeAndAllData(userId, deleteTarget.homeId, {
      remainingHomeIds,
    });

    if (!result.ok) {
      setDeleteError(result.message);
      setDeletingProperty(false);
      return;
    }

    setDeleteSuccess(`${deleteTarget.name} was deleted.`);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeletingProperty(false);
    await onPropertyDeleted();
    await loadSummary();
  };

  const supportHref = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent("Vireon support request")}`;

  return (
    <>
      <section
        className="settings-section"
        aria-labelledby="settings-data-privacy-heading"
      >
        <h2 id="settings-data-privacy-heading" className="settings-section-title">
          Data &amp; privacy
        </h2>

        <div className="settings-card">
          <p className="settings-field-label">Your data</p>
          <p className="settings-field-hint">
            Summary of records stored in your account across all properties.
          </p>

          {deleteSuccess ? (
            <p
              className="settings-form-message settings-form-message--success"
              role="status"
            >
              {deleteSuccess}
            </p>
          ) : null}

          {summaryLoading || loading ? (
            <p className="settings-summary-line">Loading data summary…</p>
          ) : summaryError ? (
            <p
              className="settings-form-message settings-form-message--error"
              role="alert"
            >
              {summaryError}
            </p>
          ) : summary ? (
            <>
              <ul className="settings-summary-list">
                <li className="settings-summary-line">
                  {formatPropertyCount(summary.propertyCount)}
                </li>
                <li className="settings-summary-line">
                  {formatRecordCount(summary.totalRecords)} ·{" "}
                  {formatImageCount(summary.totalImages)}
                </li>
                <li className="settings-summary-line">
                  {formatDocumentCount(summary.documentCount)} in My Home
                </li>
              </ul>

              {summary.properties.length > 0 ? (
                <div className="settings-properties">
                  <p className="settings-field-label">Properties</p>
                  <p className="settings-field-hint">
                    Each property below belongs only to your account. Deleting
                    a property removes its logs, images, and documents from
                    your Vireon data.
                  </p>
                  <ul className="settings-property-list">
                    {summary.properties.map((property) => (
                      <li
                        key={property.homeId}
                        className="settings-property-row"
                      >
                        <div className="settings-property-copy">
                          <p className="settings-property-name">
                            {property.name}
                          </p>
                          <p className="settings-property-address">
                            {property.address.trim() || "No address on file"}
                          </p>
                          <p className="settings-property-meta">
                            {formatPropertySummary(property)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="settings-btn-danger settings-btn-danger--compact"
                          onClick={() => handleOpenDelete(property)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="settings-summary-line">
                  No properties on your account yet.
                </p>
              )}
            </>
          ) : null}

          <hr className="settings-divider" />

          <p className="settings-field-label">Export &amp; policies</p>
          <p className="settings-field-hint">
            Download your evidence or review how Vireon handles your information.
          </p>
          <div className="settings-actions">
            <Link
              href={ROUTE_DASHBOARD_EVIDENCE_PACKAGE}
              className="settings-link-btn"
            >
              Download Evidence Package
            </Link>
            <Link href={ROUTE_PRIVACY} className="settings-link-btn">
              Privacy Policy
            </Link>
            <Link href={ROUTE_TERMS} className="settings-link-btn">
              Terms of Service
            </Link>
            <Link href={ROUTE_ACCOUNT_DELETION} className="settings-link-btn">
              Account Deletion Policy
            </Link>
          </div>

          <hr className="settings-divider" />

          <p className="settings-field-label">Support</p>
          <p className="settings-field-hint">
            Questions about your account or data? Contact us by email.
          </p>
          <div className="settings-actions">
            <a href={supportHref} className="settings-link-btn">
              {LEGAL_CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <DeletePropertyDialog
        property={deleteTarget}
        open={deleteDialogOpen}
        deleting={deletingProperty}
        error={deleteError}
        onClose={handleCloseDelete}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
