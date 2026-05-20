"use client";

import type { CSSProperties } from "react";
import { PROPERTY_LIMIT_MESSAGE } from "@/lib/propertiesStore";
import { colors, fontFamily, space } from "../ui";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
};

export function UpgradeModal({
  open,
  onClose,
  title = "Upgrade to Pro",
  message = PROPERTY_LIMIT_MESSAGE,
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="my-home-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="my-home-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upgrade-modal-title" style={modalTitle}>
          {title}
        </h2>
        <p style={modalBody}>{message}</p>
        <div style={modalActions}>
          <button
            type="button"
            className="my-home-btn-primary"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

const modalTitle: CSSProperties = {
  margin: 0,
  fontFamily,
  fontSize: 20,
  fontWeight: 600,
  color: colors.text,
};

const modalBody: CSSProperties = {
  margin: `${space.md}px 0 ${space.lg}px`,
  fontFamily,
  fontSize: 15,
  lineHeight: 1.55,
  color: colors.textSecondary,
};

const modalActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: space.sm,
};
