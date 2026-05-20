"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UpgradeModal } from "../components/UpgradeModal";
import {
  addGalleryMedia,
  assignMediaToFolder,
  canAssignFolderEvidence,
  canRenameFolder,
  getDefaultFolderIdForProperty,
  getFolderById,
  GALLERY_LIMIT_MESSAGE,
  GALLERY_LIMIT_REACHED_CODE,
  getGalleryUploadLimitLabel,
  getPropertyForMedia,
  listFoldersByPropertyId,
  listGalleryMedia,
  listGalleryMediaByPropertyId,
  type Folder,
  type GalleryMedia,
} from "@/lib/gallery";
import { canUploadGalleryMedia } from "@/lib/permissions";
import {
  useProfileId,
  useSubscriptionPlan,
} from "@/lib/subscription/useSubscriptionPlan";
import {
  getCurrentProperty,
  listProperties,
  type Property,
} from "@/lib/propertiesStore";
import { CreateFolderModal } from "./CreateFolderModal";
import { RenameFolderModal } from "./RenameFolderModal";
import { GalleryFolderPanel } from "./GalleryFolderPanel";
import { GalleryMediaDetailPanel } from "./GalleryMediaDetailPanel";
import { GalleryMediaGrid } from "./GalleryMediaGrid";
import {
  MarkEvidenceModal,
  type MarkEvidenceModalTarget,
} from "./MarkEvidenceModal";

export default function Gallery() {
  const profileId = useProfileId();
  const { plan, refresh: refreshPlan } = useSubscriptionPlan(profileId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [canUpload, setCanUpload] = useState(true);
  const [limitLabel, setLimitLabel] = useState("");
  const [evidenceModalTarget, setEvidenceModalTarget] =
    useState<MarkEvidenceModalTarget | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(
    null
  );

  const selectDefaultFolder = useCallback((pid: string) => {
    if (!pid) {
      setSelectedFolderId("");
      return;
    }
    setSelectedFolderId(getDefaultFolderIdForProperty(pid));
  }, []);

  const loadFolders = useCallback(
    (pid: string, options?: { resetSelection?: boolean }) => {
      if (!pid) {
        setFolders([]);
        setSelectedFolderId("");
        return;
      }
      const next = listFoldersByPropertyId(pid);
      setFolders(next);

      if (options?.resetSelection) {
        selectDefaultFolder(pid);
        return;
      }

      setSelectedFolderId((prev) => {
        const stillValid =
          prev &&
          next.some((f) => f.id === prev && String(f.propertyId) === pid);
        if (stillValid) return prev;
        return getDefaultFolderIdForProperty(pid);
      });
    },
    [selectDefaultFolder]
  );

  const refresh = useCallback(() => {
    setMedia(listGalleryMedia());
    setProperties(listProperties());
    refreshPlan();
    if (!plan) {
      setCanUpload(false);
      setLimitLabel("");
      return;
    }
    const scopeId = propertyId || getCurrentProperty()?.id;
    const count = scopeId
      ? listGalleryMediaByPropertyId(scopeId).length
      : listGalleryMedia().length;
    setCanUpload(canUploadGalleryMedia(plan, count));
    setLimitLabel(getGalleryUploadLimitLabel(plan));
  }, [plan, propertyId, refreshPlan]);

  useEffect(() => {
    refresh();
    const props = listProperties();
    const current = getCurrentProperty();
    if (current) {
      setPropertyId(String(current.id));
    } else if (props.length === 1) {
      setPropertyId(String(props[0].id));
    }
  }, [refresh]);

  useEffect(() => {
    loadFolders(propertyId, { resetSelection: true });
  }, [propertyId, loadFolders]);

  useEffect(() => {
    if (!propertyId) return;
    loadFolders(propertyId);
  }, [media, propertyId, loadFolders]);

  const currentProperty = properties.find(
    (p) => String(p.id) === propertyId
  );

  const folderMedia = useMemo(() => {
    if (!propertyId || !selectedFolderId) return [];
    const folder = getFolderById(selectedFolderId);
    if (!folder || String(folder.propertyId) !== propertyId) return [];
    return media.filter(
      (item) =>
        String(item.propertyId) === propertyId &&
        item.folderId === selectedFolderId
    );
  }, [media, propertyId, selectedFolderId]);

  const selectedMedia = useMemo(
    () => folderMedia.find((m) => m.id === selectedMediaId) ?? null,
    [folderMedia, selectedMediaId]
  );

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return (
      folders.find((f) => f.id === selectedFolderId) ??
      getFolderById(selectedFolderId)
    );
  }, [folders, selectedFolderId]);

  useEffect(() => {
    if (
      selectedMediaId !== null &&
      !folderMedia.some((m) => m.id === selectedMediaId)
    ) {
      setSelectedMediaId(folderMedia[0]?.id ?? null);
    }
  }, [folderMedia, selectedMediaId]);

  useEffect(() => {
    setSelectedMediaId(null);
  }, [selectedFolderId, propertyId]);

  const handleFolderSelect = (folderId: string) => {
    if (!propertyId) return;
    const folder = getFolderById(folderId);
    if (!folder || String(folder.propertyId) !== propertyId) return;
    setSelectedFolderId(folderId);
    setSelectedMediaId(null);
  };

  const handleFolderCreated = (folder: Folder) => {
    setFolders((prev) => {
      if (prev.some((f) => f.id === folder.id)) return prev;
      return [...prev, folder].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    });
    setSelectedFolderId(folder.id);
    refresh();
    loadFolders(propertyId);
  };

  const handleFolderRenamed = (folder: Folder) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folder.id ? folder : f))
    );
    loadFolders(propertyId);
  };

  const handleOpenRenameFolder = useCallback(() => {
    if (!propertyId || !selectedFolderId) return;

    const folder = getFolderById(selectedFolderId);
    if (!folder || String(folder.propertyId) !== String(propertyId)) return;
    if (!canRenameFolder(folder)) return;

    setRenameFolderTarget(folder);
    setRenameFolderOpen(true);
  }, [propertyId, selectedFolderId]);

  const handleCloseRenameFolder = useCallback(() => {
    setRenameFolderOpen(false);
    setRenameFolderTarget(null);
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setError(null);
    setUploading(true);

    const result = await addGalleryMedia({
      propertyId: Number(propertyId),
      files: Array.from(files),
    });

    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!result.ok) {
      if (result.code === GALLERY_LIMIT_REACHED_CODE) {
        setUpgradeOpen(true);
      }
      setError(result.message);
      return;
    }

    refresh();

    setSelectedFolderId(getDefaultFolderIdForProperty(propertyId));
    loadFolders(propertyId);
  };

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">Gallery</h1>
          <p className="my-home-subtitle">
            Upload, organize folders, and manage media. Assign evidence links
            here — view them in the Vault.
          </p>
          {limitLabel ? (
            <p className="my-home-text-muted" style={{ marginTop: 8 }}>
              {limitLabel}
            </p>
          ) : null}
        </div>
      </header>

      {properties.length === 0 ? (
        <div className="my-home-empty">
          Add a property before uploading media.{" "}
          <Link href="/my-home/properties/new">Add a property</Link>.
        </div>
      ) : (
        <>
          <section className="my-home-card" style={{ marginBottom: 24 }}>
            <h2 className="my-home-card-title">Upload</h2>

            {error ? (
              <p
                className="my-home-form-error"
                role="alert"
                style={{ marginBottom: 16 }}
              >
                {error}
              </p>
            ) : null}

            <div className="my-home-gallery-upload">
              <div className="my-home-field" style={{ flex: 1, minWidth: 200 }}>
                <label className="my-home-label" htmlFor="gallery-property">
                  Property
                </label>
                <select
                  id="gallery-property"
                  className="my-home-input"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  disabled={uploading}
                  required
                >
                  <option value="" disabled>
                    Select a property
                  </option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="my-home-gallery-upload-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="my-home-gallery-file-input"
                  disabled={uploading || !propertyId || !canUpload}
                  onChange={(e) => void handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  className="my-home-btn-primary"
                  disabled={uploading || !propertyId || !canUpload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Choose files"}
                </button>
                {!canUpload ? (
                  <button
                    type="button"
                    className="my-home-btn-secondary"
                    onClick={() => setUpgradeOpen(true)}
                  >
                    Upgrade to Pro
                  </button>
                ) : null}
              </div>
            </div>

            {!canUpload ? (
              <p className="my-home-text-muted" style={{ marginTop: 12 }}>
                {GALLERY_LIMIT_MESSAGE}
              </p>
            ) : null}
          </section>

          <div className="my-home-gallery-workspace">
            <GalleryFolderPanel
              folders={folders}
              selectedFolderId={selectedFolderId}
              propertyId={propertyId}
              onSelectFolder={handleFolderSelect}
              onCreateFolder={() => setCreateFolderOpen(true)}
              onRenameFolder={handleOpenRenameFolder}
            />
            <GalleryMediaGrid
              items={folderMedia}
              selectedMediaId={selectedMediaId}
              propertyId={propertyId}
              selectedFolderId={selectedFolderId}
              selectedFolderName={
                folders.find((f) => f.id === selectedFolderId)?.name
              }
              onSelectMedia={setSelectedMediaId}
            />
            <GalleryMediaDetailPanel
              selectedFolder={selectedFolder}
              media={selectedMedia}
              propertyId={propertyId}
              property={
                selectedMedia
                  ? getPropertyForMedia(selectedMedia)
                  : currentProperty
              }
              folders={folders}
              onAssignFolderEvidence={() => {
                const folder = selectedFolderId
                  ? getFolderById(selectedFolderId)
                  : null;
                if (folder && canAssignFolderEvidence(folder)) {
                  setEvidenceModalTarget({ mode: "folder", folder });
                }
              }}
              onAssignMediaEvidence={() => {
                if (selectedMedia) {
                  setEvidenceModalTarget({
                    mode: "media",
                    media: selectedMedia,
                  });
                }
              }}
              onMediaMoved={() => {
                refresh();
                loadFolders(propertyId);
              }}
            />
          </div>
        </>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        message={GALLERY_LIMIT_MESSAGE}
      />

      <MarkEvidenceModal
        target={evidenceModalTarget}
        open={evidenceModalTarget !== null}
        onClose={() => setEvidenceModalTarget(null)}
        onSaved={() => {
          refresh();
          loadFolders(propertyId);
        }}
      />

      {propertyId && currentProperty ? (
        <CreateFolderModal
          open={createFolderOpen}
          propertyId={propertyId}
          propertyName={currentProperty.name}
          onClose={() => setCreateFolderOpen(false)}
          onCreated={handleFolderCreated}
        />
      ) : null}

      {properties.length > 0 ? (
        <RenameFolderModal
          open={renameFolderOpen}
          folder={renameFolderTarget}
          propertyName={
            renameFolderTarget
              ? (properties.find(
                  (p) => String(p.id) === String(renameFolderTarget.propertyId)
                )?.name ?? "Property")
              : (currentProperty?.name ?? "Property")
          }
          onClose={handleCloseRenameFolder}
          onRenamed={handleFolderRenamed}
        />
      ) : null}
    </>
  );
}
