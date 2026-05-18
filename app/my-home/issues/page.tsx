"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Issues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const issuesData = JSON.parse(localStorage.getItem("issues") || "[]");
    const propData = JSON.parse(localStorage.getItem("properties") || "[]");

    setIssues(issuesData);
    setProperties(propData);
  }, []);

  const getPropertyName = (id: string) => {
    return properties.find((p) => p.id == id)?.name || "Unknown Property";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Issues</h1>

        <Link href="/my-home/issues/new">
          <button style={button}>+ Log Issue</button>
        </Link>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {issues.length === 0 ? (
          <p style={{ color: "#888" }}>No issues logged yet.</p>
        ) : (
          issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/my-home/issues/${issue.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={card}>
                <strong>{issue.title}</strong>

                <p style={{ margin: 0, color: "#666" }}>
                  {issue.description}
                </p>

                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                  Property: {getPropertyName(issue.propertyId)}
                </p>

                <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
                  {new Date(issue.createdAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 14,
  border: "1px solid #eaeaea",
  borderRadius: 10,
  background: "#fff",
};

const button: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};