"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewIssue() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("properties") || "[]");
    setProperties(data);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const existing = JSON.parse(localStorage.getItem("issues") || "[]");

    const newIssue = {
      id: Date.now(),
      title,
      description,
      propertyId,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "issues",
      JSON.stringify([...existing, newIssue])
    );

    router.push("/my-home/issues");
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Log Issue</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {/* PROPERTY SELECT */}
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          style={input}
          required
        >
          <option value="">Select Property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={input}
        />

        <textarea
          placeholder="Describe the issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={textarea}
        />

        <button type="submit" style={button}>
          Save Issue
        </button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
};

const textarea: React.CSSProperties = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 8,
  minHeight: 120,
};

const button: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "white",
  cursor: "pointer",
};