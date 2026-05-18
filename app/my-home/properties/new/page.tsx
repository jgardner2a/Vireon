"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "../../ui";

export default function NewProperty() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    <div style={{ ...page, ...formNarrow }}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Add property</h1>
          <p style={subtitle}>Save a rental location for issues and evidence</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={form}>
        <div style={field}>
          <label style={label} htmlFor="property-name">
            Property name
          </label>
          <input
            id="property-name"
            className="my-home-input"
            placeholder="e.g. Downtown Apartment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
            required
          />
        </div>

        <div style={field}>
          <label style={label} htmlFor="property-address">
            Address
          </label>
          <input
            id="property-address"
            className="my-home-input"
            placeholder="Street, city, state"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={input}
            required
          />
        </div>

        <button type="submit" className="my-home-btn-primary">
          Save property
        </button>
      </form>
    </div>
  );
}
