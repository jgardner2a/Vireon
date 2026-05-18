"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PropertyDetail() {
  const { id } = useParams();

  const [property, setProperty] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    const properties = JSON.parse(localStorage.getItem("properties") || "[]");
    const allIssues = JSON.parse(localStorage.getItem("issues") || "[]");

    const foundProperty = properties.find(
      (p: any) => String(p.id) === String(id)
    );

    const relatedIssues = allIssues.filter(
      (i: any) => String(i.propertyId) === String(id)
    );

    setProperty(foundProperty);
    setIssues(relatedIssues);
  }, [id]);

  if (!property) {
    return (
      <div>
        <h1>Property not found</h1>
        <p>This property may not exist anymore.</p>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>
          {property.name}
        </h1>
        <p style={{ color: "#666" }}>{property.address}</p>
      </div>

      {/* ACTION */}
      <Link href="/my-home/issues/new">
        <button style={button}>+ Add Issue</button>
      </Link>

      {/* ISSUES SECTION */}
      <div style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 18 }}>Issues for this property</h2>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {issues.length === 0 ? (
            <p style={{ color: "#888" }}>
              No issues logged for this property.
            </p>
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

                  <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
                    {new Date(issue.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
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