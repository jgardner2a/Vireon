"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("properties") || "[]");
    setProperties(data);
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Properties</h1>

        <Link href="/my-home/properties/new">
          <button style={button}>+ Add</button>
        </Link>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {properties.length === 0 ? (
          <p style={{ color: "#888" }}>No properties yet.</p>
        ) : (
          properties.map((p) => (
            <div key={p.id} style={card}>
              <strong>{p.name}</strong>
              <p style={{ margin: 0, color: "#666" }}>{p.address}</p>
            </div>
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