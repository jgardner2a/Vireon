"use client";

import { useMemo } from "react";
import { hasEvidenceRelationship, projectFolderEvidenceLink } from "@/lib/evidence";
import {
  canRenameFolder,
  isSystemFolder,
  UNSORTED_FOLDER_NAME,
  type Folder,
} from "@/lib/gallery";

type GalleryFolderPanelProps = {
  folders: Folder[];
  selectedFolderId: string;
  propertyId: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
};

function FolderListItem({
  folder,
  isActive,
  variant,
  onSelect,
}: {
  folder: Folder;
  isActive: boolean;
  variant: "user" | "system";
  onSelect: (folderId: string) => void;
}) {
  const isSystem = variant === "system";

  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        className={[
          "my-home-gallery-folder-item",
          isActive ? "my-home-gallery-folder-item--active" : "",
          isSystem ? "my-home-gallery-folder-item--system" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onSelect(folder.id)}
      >
        <span className="my-home-gallery-folder-item__name">
          {folder.name}
          {hasEvidenceRelationship(projectFolderEvidenceLink(folder)) &&
          !isSystem ? (
            <span className="my-home-gallery-folder-item__badge my-home-gallery-folder-item__badge--evidence">
              Evidence
            </span>
          ) : null}
        </span>
        <span className="my-home-gallery-folder-item__count">
          {folder.mediaIds.length}
        </span>
      </button>
    </li>
  );
}

export function GalleryFolderPanel({
  folders,
  selectedFolderId,
  propertyId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
}: GalleryFolderPanelProps) {
  const { userFolders, systemFolder } = useMemo(() => {
    const system = folders.find((f) => isSystemFolder(f)) ?? null;
    const user = folders.filter((f) => !isSystemFolder(f));
    return { userFolders: user, systemFolder: system };
  }, [folders]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const canRename = Boolean(
    propertyId && selectedFolder && canRenameFolder(selectedFolder)
  );

  return (
    <aside className="my-home-gallery-panel my-home-gallery-panel--folders">
      <h2 className="my-home-gallery-panel-title">Folders</h2>

      {!propertyId ? (
        <p className="my-home-text-muted my-home-gallery-panel-hint">
          Select a property in Upload to browse folders.
        </p>
      ) : !systemFolder && userFolders.length === 0 ? (
        <p className="my-home-text-muted my-home-gallery-panel-hint">
          No folders yet.
        </p>
      ) : (
        <>
          {userFolders.length === 0 ? (
            <p className="my-home-text-muted my-home-gallery-panel-hint">
              No custom folders yet. Create one below, or upload to{" "}
              {UNSORTED_FOLDER_NAME}.
            </p>
          ) : (
            <ul
              className="my-home-gallery-folder-list"
              role="listbox"
              aria-label="Your folders"
            >
              {userFolders.map((folder) => (
                <FolderListItem
                  key={folder.id}
                  folder={folder}
                  isActive={folder.id === selectedFolderId}
                  variant="user"
                  onSelect={onSelectFolder}
                />
              ))}
            </ul>
          )}

          {systemFolder ? (
            <section
              className="my-home-gallery-folder-system"
              aria-label="Default inbox"
            >
              <p className="my-home-gallery-folder-system__label">
                {UNSORTED_FOLDER_NAME}
              </p>
              <ul
                className="my-home-gallery-folder-list my-home-gallery-folder-list--system"
                role="listbox"
                aria-label={`${UNSORTED_FOLDER_NAME} inbox`}
              >
                <FolderListItem
                  folder={systemFolder}
                  isActive={systemFolder.id === selectedFolderId}
                  variant="system"
                  onSelect={onSelectFolder}
                />
              </ul>
            </section>
          ) : null}
        </>
      )}

      <section className="my-home-gallery-folder-actions">
        <button
          type="button"
          className="my-home-btn-secondary my-home-gallery-create-folder-btn"
          disabled={!propertyId}
          onClick={onCreateFolder}
        >
          + Create Folder
        </button>
        <button
          type="button"
          className="my-home-btn-secondary my-home-gallery-create-folder-btn"
          disabled={!canRename}
          title={
            canRename
              ? undefined
              : `Select a custom folder to rename`
          }
          onClick={onRenameFolder}
        >
          Rename Folder
        </button>
      </section>
    </aside>
  );
}
