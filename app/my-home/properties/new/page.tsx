"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyLimitUpgradePrompt } from "../../components/PropertyLimitUpgradePrompt";
import { UpgradeModal } from "../../components/UpgradeModal";
import { usePropertyCreationLimit } from "../../hooks/usePropertyCreationLimit";
import {
  createProperty,
  formatPropertyLimitLabel,
  getCurrentUserPropertyLimitStatus,
  propertyLimitReachedMessage,
  PROPERTY_LIMIT_REACHED_CODE,
} from "@/lib/propertiesStore";
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
  const { status: limit, limitReached } = usePropertyCreationLimit();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formDisabled = limitReached;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formDisabled) return;

    setError(null);

    const result = await createProperty({ name, address });

    if (!result.ok) {
      if (result.code === PROPERTY_LIMIT_REACHED_CODE) {
        const status = await getCurrentUserPropertyLimitStatus();
        if (status) {
          setError(propertyLimitReachedMessage(status));
        } else {
          setError(result.message);
        }
        setUpgradeOpen(true);
      } else {
        setError(result.message);
      }
      return;
    }

    router.push("/my-home/properties");
  };

  return (
    <div style={{ ...page, ...formNarrow }}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Add property</h1>
          <p style={subtitle}>Save a rental location for issues and evidence</p>
          {limit && Number.isFinite(limit.max) ? (
            <p className="my-home-text-muted" style={{ margin: 0 }}>
              {formatPropertyLimitLabel(limit)} on your plan
            </p>
          ) : null}
        </div>
      </header>

      {limitReached ? <PropertyLimitUpgradePrompt /> : null}

      <form onSubmit={handleSubmit} style={form} aria-disabled={formDisabled}>
        {error ? (
          <p className="my-home-form-error" role="alert">
            {error}
          </p>
        ) : null}

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
            disabled={formDisabled}
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
            disabled={formDisabled}
          />
        </div>

        <button
          type="submit"
          className="my-home-btn-primary"
          disabled={formDisabled}
        >
          Save property
        </button>
      </form>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
