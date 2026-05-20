"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ISSUE_STATUSES,
  IssueStatusBadge,
  type IssueStatus,
} from "../../issueStatus";
import {
  getIssueById,
  getPropertyForIssue,
  updateIssueStatus,
  type Issue,
} from "@/lib/issuesStore";
import { IssueLinkedEvidence } from "../IssueLinkedEvidence";

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState<Issue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = getIssueById(String(id));
    setIssue(found ?? null);
  }, [id]);

  const handleStatusChange = async (status: IssueStatus) => {
    if (!issue) return;

    const result = await updateIssueStatus(issue.id, status);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    setIssue(result.issue);
  };

  if (issue === undefined) {
    return (
      <div className="my-home-card my-home-card--flat">
        <p className="my-home-text-muted">Loading issue…</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <>
        <Link href="/my-home/issues" className="my-home-back-link">
          ← Back to issues
        </Link>
        <header className="my-home-page-header my-home-page-header--with-back">
          <div>
            <h1 className="my-home-title">Issue not found</h1>
            <p className="my-home-subtitle">
              This issue may have been removed.
            </p>
          </div>
        </header>
      </>
    );
  }

  const property = getPropertyForIssue(issue);

  return (
    <>
      <Link href="/my-home/issues" className="my-home-back-link">
        ← Back to issues
      </Link>

      <header className="my-home-page-header my-home-page-header--with-back">
        <div>
          <div className="my-home-row-between">
            <h1 className="my-home-title">{issue.title}</h1>
            <IssueStatusBadge status={issue.status} />
          </div>
          <p className="my-home-subtitle" style={{ marginTop: 12 }}>
            Logged {new Date(issue.createdAt).toLocaleString()}
          </p>
        </div>
      </header>

      <section className="my-home-card" style={{ marginBottom: 16 }}>
        <h2 className="my-home-card-title">Property</h2>
        {property ? (
          <p className="my-home-body-text">
            <Link href={`/my-home/properties/${property.id}`}>
              {property.name}
            </Link>
            <br />
            <span className="my-home-text-muted">{property.address}</span>
          </p>
        ) : (
          <p className="my-home-text-muted">Unknown property</p>
        )}
      </section>

      <section className="my-home-card" style={{ marginBottom: 16 }}>
        <h2 className="my-home-card-title">Status</h2>
        {error ? (
          <p className="my-home-form-error" role="alert" style={{ marginBottom: 12 }}>
            {error}
          </p>
        ) : null}
        <div className="my-home-field">
          <label className="my-home-label" htmlFor="issue-status">
            Update status
          </label>
          <select
            id="issue-status"
            className="my-home-input"
            value={issue.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as IssueStatus)
            }
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="my-home-card" style={{ marginBottom: 16 }}>
        <h2 className="my-home-card-title">Description</h2>
        <p className="my-home-body-text">{issue.description}</p>
      </section>

      <IssueLinkedEvidence
        targetType="issue"
        targetId={issue.id}
        propertyId={issue.propertyId}
      />
    </>
  );
}
