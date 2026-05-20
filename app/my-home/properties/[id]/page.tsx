"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IssueStatusBadge } from "../../issueStatus";
import { listIssuesByPropertyId, type Issue } from "@/lib/issuesStore";
import { getLeaseByPropertyId } from "@/lib/leasesStore";
import { bootstrapMyHomeData } from "@/lib/myHomeBootstrap";
import {
  PROPERTY_RESIDENCE_CURRENT,
} from "@/lib/property/residenceStatus";
import { isPro } from "@/lib/subscription/subscription";
import {
  useProfileId,
  useSubscriptionPlan,
} from "@/lib/subscription/useSubscriptionPlan";
import {
  listProperties,
  setCurrentProperty,
  type Property,
} from "@/lib/propertiesStore";
export default function PropertyDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<Property | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [leaseTitle, setLeaseTitle] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const profileId = useProfileId();
  const { plan } = useSubscriptionPlan(profileId);
  const pro = plan ? isPro(plan) : false;

  useEffect(() => {
    void bootstrapMyHomeData().then(() => {
    const propertyId = String(id);
    const foundProperty =
      listProperties().find((p) => String(p.id) === propertyId) ?? null;

    setProperty(foundProperty);
    setIssues(
      foundProperty ? listIssuesByPropertyId(foundProperty.id) : []
    );
    const lease = foundProperty
      ? getLeaseByPropertyId(foundProperty.id)
      : undefined;
    setLeaseTitle(lease?.title ?? null);
    setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="my-home-card my-home-card--flat">
        <p className="my-home-text-muted">Loading property…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <>
        <Link href="/my-home/properties" className="my-home-back-link">
          ← Back to properties
        </Link>
        <header
          className="my-home-page-header my-home-page-header--with-back"
        >
          <div>
            <h1 className="my-home-title">Property not found</h1>
            <p className="my-home-subtitle">
              This property may not exist anymore.
            </p>
          </div>
        </header>
      </>
    );
  }

  const openCount = issues.filter((i) => i.status === "Open").length;

  return (
    <>
      <Link href="/my-home/properties" className="my-home-back-link">
        ← Back to properties
      </Link>

      <header className="my-home-page-header my-home-page-header--with-back">
        <div>
          <h1 className="my-home-title">{property.name}</h1>
          <p className="my-home-subtitle">{property.address}</p>
          <p className="my-home-text-muted" style={{ marginTop: 8 }}>
            {property.residenceStatus === PROPERTY_RESIDENCE_CURRENT
              ? "Current home"
              : "Previous rental"}
          </p>
          {actionError ? (
            <p className="my-home-form-error" role="alert" style={{ marginTop: 8 }}>
              {actionError}
            </p>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          {pro && property.residenceStatus !== PROPERTY_RESIDENCE_CURRENT ? (
            <button
              type="button"
              className="my-home-btn-secondary"
              disabled={switching}
              onClick={() => {
                setActionError(null);
                setSwitching(true);
                void setCurrentProperty(String(property.id)).then((result) => {
                  setSwitching(false);
                  if (!result.ok) {
                    setActionError(result.message);
                    return;
                  }
                  setProperty(result.property);
                });
              }}
            >
              {switching ? "Updating…" : "Set as current home"}
            </button>
          ) : null}
          <Link
            href={`/my-home/issues/new?propertyId=${property.id}`}
            className="my-home-btn-primary"
          >
            + Log issue
          </Link>
        </div>
      </header>

      <section className="my-home-card" style={{ marginBottom: 32 }}>
        <h2 className="my-home-card-title">Property details</h2>
        <dl className="my-home-definition-grid">
          <dt className="my-home-definition-term">Name</dt>
          <dd className="my-home-definition-detail">{property.name}</dd>
          <dt className="my-home-definition-term">Address</dt>
          <dd className="my-home-definition-detail">{property.address}</dd>
          <dt className="my-home-definition-term">ID</dt>
          <dd
            className="my-home-definition-detail"
            style={{ fontFamily: "monospace" }}
          >
            {property.id}
          </dd>
          <dt className="my-home-definition-term">Issues</dt>
          <dd className="my-home-definition-detail">
            {issues.length} total
            {openCount > 0 ? ` · ${openCount} open` : ""}
          </dd>
        </dl>
      </section>

      {leaseTitle ? (
        <section
          id={`lease-${getLeaseByPropertyId(property.id)?.id ?? property.id}`}
          className="my-home-card"
          style={{ marginBottom: 32 }}
        >
          <h2 className="my-home-card-title">Lease</h2>
          <p className="my-home-body-text">{leaseTitle}</p>
          <p className="my-home-text-muted" style={{ marginTop: 8 }}>
            Rental record for this property. View linked evidence in the{" "}
            <Link href="/my-home/vault">Vault</Link>.
          </p>
        </section>
      ) : null}

      <section className="my-home-section" style={{ marginTop: 0 }}>
        <h2 className="my-home-section-title">Issues</h2>

        <div className="my-home-stack">
          {issues.length === 0 ? (
            <div className="my-home-empty">
              No issues logged for this property yet.{" "}
              <Link
                href={`/my-home/issues/new?propertyId=${property.id}`}
                style={{ color: "#0f172a", fontWeight: 500 }}
              >
                Log the first issue
              </Link>
            </div>
          ) : (
            issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/my-home/issues/${issue.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="my-home-list-card">
                  <div className="my-home-row-between">
                    <span className="my-home-list-card-title">
                      {issue.title}
                    </span>
                    <IssueStatusBadge
                      status={issue.status}
                    />
                  </div>
                  <p className="my-home-body-text" style={{ marginTop: 8 }}>
                    {issue.description}
                  </p>
                  <p className="my-home-text-muted" style={{ marginTop: 8 }}>
                    {new Date(issue.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
