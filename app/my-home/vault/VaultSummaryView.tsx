"use client";

import type { VaultSummary } from "@/lib/evidence/vault";

type VaultSummaryViewProps = {
  summary: VaultSummary;
};

const cards: {
  key: keyof VaultSummary;
  label: string;
  hint: string;
}[] = [
  { key: "totalEntries", label: "Total entries", hint: "All vault records" },
  { key: "issueCount", label: "Issues", hint: "Logged problems" },
  { key: "imageCount", label: "Media", hint: "Images and videos" },
  { key: "mediaIssueLinkCount", label: "Media ↔ issue", hint: "Gallery linked to issues" },
  { key: "leaseCount", label: "Leases", hint: "Rental records" },
];

export function VaultSummaryView({ summary }: VaultSummaryViewProps) {
  return (
    <section className="vault-summary" aria-label="Vault summary">
      <div className="vault-summary-grid">
        {cards.map(({ key, label, hint }) => (
          <article key={key} className="vault-summary-card">
            <p className="vault-summary-card__label">{label}</p>
            <p className="vault-summary-card__value">{summary[key]}</p>
            <p className="vault-summary-card__hint">{hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
