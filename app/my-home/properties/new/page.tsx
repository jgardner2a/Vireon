"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProperty() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TEMP (no backend yet)
    const existing = JSON.parse(localStorage.getItem("properties") || "[]");

    const newProperty = {
      id: Date.now(),
      name,
      address,
    };

    localStorage.setItem(
      "properties",
      JSON.stringify([...existing, newProperty])
    );

    router.push("/my-home/properties");
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Add Property</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Property name (e.g. Downtown Apartment)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />

        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={input}
        />

        <button style={button} type="submit">
          Save Property
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

const button: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "white",
  cursor: "pointer",
};