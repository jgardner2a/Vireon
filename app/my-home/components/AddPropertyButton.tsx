"use client";

import Link from "next/link";
import { usePropertyCreationLimit } from "../hooks/usePropertyCreationLimit";
import { PropertyLimitUpgradePrompt } from "./PropertyLimitUpgradePrompt";

type AddPropertyButtonProps = {
  className?: string;
};

export function AddPropertyButton({
  className = "my-home-btn-primary",
}: AddPropertyButtonProps) {
  const { limitReached } = usePropertyCreationLimit();

  if (limitReached) {
    return (
      <div className="my-home-add-property-actions">
        <button
          type="button"
          className={className}
          disabled
          aria-disabled="true"
        >
          + Add property
        </button>
        <PropertyLimitUpgradePrompt className="my-home-add-property-actions__hint" />
      </div>
    );
  }

  return (
    <Link href="/my-home/properties/new" className={className}>
      + Add property
    </Link>
  );
}
