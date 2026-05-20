"use client";

import Link from "next/link";
import { getVaultCrossLinks } from "./vaultCrossLinks";
import type { VaultEntry } from "@/lib/evidence/vault";

type VaultEntryLinksProps = {
  entry: VaultEntry;
  propertyEntries: VaultEntry[];
};

export function VaultEntryLinks({
  entry,
  propertyEntries,
}: VaultEntryLinksProps) {
  const links = getVaultCrossLinks(entry, propertyEntries);

  if (links.length === 0) return null;

  return (
    <nav className="vault-entry-links" aria-label="Related records">
      {links.map((link) => (
        <Link key={`${entry.id}-${link.href}`} href={link.href} className="vault-entry-links__chip">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
