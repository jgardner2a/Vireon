"use client";

import { useState } from "react";
import { UpgradeModal } from "./UpgradeModal";

type PropertyLimitUpgradePromptProps = {
  className?: string;
};

/** Inline upgrade prompt when the property limit is reached; keeps the feature visible. */
export function PropertyLimitUpgradePrompt({
  className = "my-home-property-limit-banner",
}: PropertyLimitUpgradePromptProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <div className={className} role="status">
        <p className="my-home-property-limit-banner__text">
          Free plan allows 1 property.{" "}
          <button
            type="button"
            className="my-home-link-button"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade to add more.
          </button>
        </p>
      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
