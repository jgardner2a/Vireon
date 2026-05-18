"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IssueStatusBadge,
  normalizeIssueStatus,
} from "../../issueStatus";
import {
  card,
  emptyState,
  h1,
  h2,
  listCard,
  listCardBody,
  listCardTitle,
  meta,
  page,
  section,
  subtitle,
} from "../../ui";

export default function PropertyDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    const properties = JSON.parse(localStorage.getItem("properties") || "[]");
    const allIssues = JSON.parse(localStorage.getItem("issues") || "[]");

    const foundProperty = properties.find(
      (p: any) => String(p.id) === String(id)
    );

    const relatedIssues = allIssues
      .filter((i: any) => String(i.propertyId) === String(id))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    setProperty(foundProperty ?? null);
    setIssues(relatedIssues);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div style={page}>
        <p style={meta}>Loading property…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={page}>
        <Link
          href="/my-home/properties"
          style={{ fontSize: 14, color: "#64748b", textDecoration: "none" }}
        >
          ← Back to properties
        </Link>
        <h1 style={{ ...h1, marginTop: 24 }}>Property not found</h1>
        <p style={subtitle}>This property may not exist anymore.</p>
      </div>
    );
  }

  const openCount = issues.filter(
    (i) => normalizeIssueStatus(i.status) === "Open"
  ).length;

  return (
    <div style={page}>
      <Link
        href="/my-home/properties"
        style={{ fontSize: 14, color: "#64748b", textDecoration: "none" }}
      >
        ← Back to properties
      </Link>

      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginTop: 20,
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={h1}>{property.name}</h1>
          <p style={subtitle}>{property.address}</p>
        </div>
        <Link
          href={`/my-home/issues/new?propertyId=${property.id}`}
          className="my-home-btn-primary"
        >
          + Log issue
        </Link>
      </header>

      <div style={{ ...card, marginBottom: 32 }}>
        <h2 style={{ ...h2, marginBottom: 12 }}>Property details</h2>
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "10px 16px",
            fontSize: 14,
          }}
        >
          <dt style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>Name</dt>
          <dd style={{ margin: 0, color: "#0f172a" }}>{property.name}</dd>
          <dt style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>
            Address
          </dt>
          <dd style={{ margin: 0, color: "#0f172a" }}>{property.address}</dd>
          <dt style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>ID</dt>
          <dd style={{ margin: 0, color: "#0f172a", fontFamily: "monospace" }}>
            {property.id}
          </dd>
          <dt style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>
            Issues
          </dt>
          <dd style={{ margin: 0, color: "#0f172a" }}>
            {issues.length} total
            {openCount > 0 ? ` · ${openCount} open` : ""}
          </dd>
        </dl>
      </div>

      <section style={section}>
        <h2 style={h2}>Issues</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {issues.length === 0 ? (
            <div style={emptyState}>
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
                <div className="my-home-list-card" style={listCard}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={listCardTitle}>{issue.title}</span>
                    <IssueStatusBadge
                      status={normalizeIssueStatus(issue.status)}
                    />
                  </div>
                  <p style={listCardBody}>{issue.description}</p>
                  <p style={meta}>
                    {new Date(issue.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
