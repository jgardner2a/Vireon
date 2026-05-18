"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  emptyState,
  h1,
  listCard,
  listCardBody,
  listCardTitle,
  page,
  pageHeader,
  pageHeaderStack,
  stack,
  subtitle,
} from "../ui";

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("properties") || "[]");
    setProperties(data);
  }, []);

  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Properties</h1>
          <p style={subtitle}>Locations tied to your rental records</p>
        </div>
        <Link href="/my-home/properties/new" className="my-home-btn-primary">
          + Add property
        </Link>
      </header>

      <div style={stack}>
        {properties.length === 0 ? (
          <div style={emptyState}>No properties yet.</div>
        ) : (
          properties.map((p) => (
            <Link
              key={p.id}
              href={`/my-home/properties/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="my-home-list-card" style={listCard}>
                <span style={listCardTitle}>{p.name}</span>
                <p style={listCardBody}>{p.address}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
