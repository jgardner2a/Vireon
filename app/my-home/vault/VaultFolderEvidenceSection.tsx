"use client";

import { useMemo } from "react";
import {
  groupVaultGalleryByFolder,
  type VaultFolderContainer,
  type VaultEntry,
  type VaultImageEntry,
} from "@/lib/evidence/vault";
import { VaultGalleryMediaCard } from "./VaultGalleryMediaCard";

type VaultFolderEvidenceSectionProps = {
  galleryEntries: VaultImageEntry[];
  propertyEntries: VaultEntry[];
  showCrossLinks?: boolean;
};

function VaultFolderContainerBlock({
  container,
  propertyEntries,
  showCrossLinks,
}: {
  container: VaultFolderContainer;
  propertyEntries: VaultEntry[];
  showCrossLinks: boolean;
}) {
  return (
    <section className="vault-folder-container">
      <header className="vault-folder-container__header">
        <h4 className="vault-folder-container__title">{container.folderName}</h4>
        <span className="vault-folder-container__count">
          {container.media.length} item{container.media.length === 1 ? "" : "s"}
        </span>
      </header>
      {container.folderEvidenceLabel ? (
        <p className="vault-folder-container__evidence" role="status">
          <strong>Folder is assigned as Evidence</strong>
          <span className="vault-folder-container__evidence-detail">
            {" "}
            — applies to all media below ({container.folderEvidenceLabel})
          </span>
        </p>
      ) : (
        <p className="my-home-text-muted vault-folder-container__evidence-hint">
          No folder-level evidence; links below are per-file only.
        </p>
      )}
      <ul className="vault-folder-container__media">
        {container.media.map((entry) => (
          <li key={entry.id}>
            <VaultGalleryMediaCard
              entry={entry}
              propertyEntries={propertyEntries}
              showCrossLinks={showCrossLinks}
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VaultFolderEvidenceSection({
  galleryEntries,
  propertyEntries,
  showCrossLinks = false,
}: VaultFolderEvidenceSectionProps) {
  const containers = useMemo(
    () => groupVaultGalleryByFolder(galleryEntries),
    [galleryEntries]
  );

  if (containers.length === 0) return null;

  return (
    <section
      className="vault-folder-evidence"
      aria-label="Gallery evidence by folder"
    >
      <header className="vault-folder-evidence__header">
        <h3 className="my-home-section-title" style={{ margin: 0, fontSize: 17 }}>
          Gallery evidence
        </h3>
        <p className="my-home-text-muted" style={{ marginTop: 6 }}>
          Media grouped by gallery folder. Folder assignments override per-file
          links.
        </p>
      </header>
      <div className="vault-folder-evidence__containers">
        {containers.map((container) => (
          <VaultFolderContainerBlock
            key={container.folderId}
            container={container}
            propertyEntries={propertyEntries}
            showCrossLinks={showCrossLinks}
          />
        ))}
      </div>
    </section>
  );
}
