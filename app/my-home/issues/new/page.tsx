"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_ISSUE_STATUS } from "../../issueStatus";
import {
  field,
  form,
  formNarrow,
  h1,
  label,
  page,
  pageHeader,
  pageHeaderStack,
  subtitle,
  input,
  textarea,
} from "../../ui";

export default function NewIssue() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("propertyId");
    if (fromUrl) setPropertyId(fromUrl);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const existing = JSON.parse(localStorage.getItem("issues") || "[]");

    const newIssue = {
      id: Date.now(),
      title,
      description,
      propertyId,
      status: DEFAULT_ISSUE_STATUS,
      images: [],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "issues",
      JSON.stringify([...existing, newIssue])
    );

    router.push(
      propertyId ? `/my-home/properties/${propertyId}` : "/my-home/issues"
    );
  };

  return (
    <div style={{ ...page, ...formNarrow }}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Log issue</h1>
          <p style={subtitle}>Record a problem tied to a property</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={form}>
        <div style={field}>
          <label style={label} htmlFor="issue-title">
            Title
          </label>
          <input
            id="issue-title"
            className="my-home-input"
            placeholder="Brief summary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
            required
          />
        </div>

        <div style={field}>
          <label style={label} htmlFor="issue-description">
            Description
          </label>
          <textarea
            id="issue-description"
            className="my-home-textarea"
            placeholder="What happened? Include details for your records."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={textarea}
            required
          />
        </div>

        <div style={field}>
          <label style={label} htmlFor="issue-property-id">
            Property ID
          </label>
          <input
            id="issue-property-id"
            className="my-home-input"
            placeholder="ID from your properties list"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            style={input}
            required
          />
        </div>

        <button type="submit" className="my-home-btn-primary">
          Save issue
        </button>
      </form>
    </div>
  );
}
