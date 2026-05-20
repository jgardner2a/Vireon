"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createIssue } from "@/lib/issuesStore";
import {
  getCurrentProperty,
  listProperties,
  type Property,
} from "@/lib/propertiesStore";

export default function NewIssue() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const props = listProperties();
    setProperties(props);

    const fromUrl = searchParams.get("propertyId");
    if (fromUrl && props.some((p) => String(p.id) === fromUrl)) {
      setPropertyId(fromUrl);
    } else {
      const current = getCurrentProperty();
      if (current) {
        setPropertyId(String(current.id));
      } else if (props.length === 1) {
        setPropertyId(String(props[0].id));
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await createIssue({
      title,
      description,
      propertyId,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/my-home/issues/${result.issue.id}`);
  };

  return (
    <>
      <Link href="/my-home/issues" className="my-home-back-link">
        ← Back to issues
      </Link>

      <header className="my-home-page-header my-home-page-header--with-back">
        <div>
          <h1 className="my-home-title">Log issue</h1>
          <p className="my-home-subtitle">
            Record a problem for one property
          </p>
        </div>
      </header>

      {properties.length === 0 ? (
        <div className="my-home-empty">
          You need at least one property before logging an issue.{" "}
          <Link href="/my-home/properties/new">Add a property</Link>.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="my-home-form"
          style={{ maxWidth: 480 }}
        >
          {error ? (
            <p className="my-home-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="my-home-field">
            <label className="my-home-label" htmlFor="issue-property">
              Property
            </label>
            <select
              id="issue-property"
              className="my-home-input"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a property
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="my-home-field">
            <label className="my-home-label" htmlFor="issue-title">
              Title
            </label>
            <input
              id="issue-title"
              className="my-home-input"
              placeholder="Brief summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="my-home-field">
            <label className="my-home-label" htmlFor="issue-description">
              Description
            </label>
            <textarea
              id="issue-description"
              className="my-home-textarea"
              placeholder="What happened? Include details for your records."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="my-home-btn-primary">
            Save issue
          </button>
        </form>
      )}
    </>
  );
}
