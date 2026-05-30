"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { PlanUsageHints } from "@/app/dashboard/_components/PlanUsageHints";
import {
  getValidCachedSignedUrl,
  invalidateSignedUrlCache,
  invalidateSignedUrlCacheForUser,
  resolveSignedGalleryUrls,
} from "@/lib/gallerySignedUrlCache";
import { buildGalleryDisplayEntriesFromPaths } from "@/lib/gallery/buildGalleryDisplay";
import { buildPathsFromGalleryItems } from "@/lib/gallery/buildGalleryPaths";
import { copyGalleryItemsToFolder } from "@/lib/gallery/copyGalleryItemsToFolder";
import { deleteGalleryItem } from "@/lib/gallery/deleteGalleryItem";
import { moveGalleryItemsToFolder } from "@/lib/gallery/moveGalleryItemsToFolder";
import {
  createFolder,
  fetchFoldersForHome,
  type Folder,
} from "@/lib/gallery/folders";
import { fetchGalleryItemsForHome } from "@/lib/gallery/galleryRecords";
import {
  useGallerySelection,
  type GallerySelectionItem,
} from "@/lib/gallery/useGallerySelection";
import { markGalleryAsEvidence } from "@/lib/gallery/markGalleryAsEvidence";
import {
  enrichGalleryEntriesWithSnapshotOwnership,
  fetchSnapshotGalleryEvidence,
  SNAPSHOT_EVIDENCE_OWNER_TYPE,
} from "@/lib/snapshots/galleryEvidence";
import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";
import {
  getCachedStorageList,
  invalidateStorageCache,
} from "@/lib/storageCache";
import { noteDisplayTitle } from "@/lib/notes/format";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = STORAGE_BUCKET;
const PAGE_SIZE = 20;
/** Max thumbnails mounted in the DOM (head + tail windows). */
const MAX_VISIBLE = 60;
/** Extra items before the current batch in the tail window. */
const VISIBLE_BUFFER = 20;
/** Approximate row height for mid-list scroll spacer (square card + gap). */
const GALLERY_ROW_HEIGHT_PX = 100;
/** List cap for large galleries; paths are batched client-side. */
const LIST_LIMIT = 1000;
/** Stagger delay between thumbnails in the same appended batch. */
const STAGGER_STEP_MS = 40;

type StaggerWindow = {
  start: number;
  epoch: number;
};

/** Defer React DOM commits to the next frame to reduce scroll jank on batch append. */
function scheduleGalleryDomUpdate(apply: () => void): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => resolve());
    });
  });
}

type GalleryFile = {
  path: string;
  name: string;
  url: string;
  galleryId: string | null;
  ownerType: string | null;
  ownerId: string | null;
  folderId: string | null;
};

type SignedGalleryFile = {
  path: string;
  name: string;
  url: string;
};

type EvidenceType = "maintenance" | "communication" | "note" | "complex" | "snapshot";
type EvidenceRecordFilter = {
  ownerType: EvidenceType;
  ownerId: string;
};
type ActiveSidebarFilter = "folder" | "evidence" | null;
type UploadGalleryContext =
  | "gallery"
  | "maintenance"
  | "note"
  | "communication"
  | "complex";
type EvidenceRecordItem = {
  ownerType: EvidenceType;
  ownerId: string;
  label: string;
};
type EvidenceSection = {
  ownerType: EvidenceType;
  title: string;
  records: EvidenceRecordItem[];
};

function isEvidenceOwnerType(ownerType: string | null): ownerType is EvidenceType {
  return (
    ownerType === "maintenance" ||
    ownerType === "communication" ||
    ownerType === "note" ||
    ownerType === "complex" ||
    ownerType === SNAPSHOT_EVIDENCE_OWNER_TYPE
  );
}

function buildPathsFromList(
  listed: { name: string; id: string | null }[] | null,
  userId: string,
  homeId: string
): string[] {
  const paths = (listed ?? [])
    .filter((item) => item.name && item.id !== null)
    .map((item) => `${userId}/${homeId}/${item.name}`);

  paths.reverse();
  return paths;
}

type VisibleGallerySlice = {
  head: GalleryFile[];
  tail: GalleryFile[];
  midSpacerPx: number;
};

/** Newest-first head window + current batch tail window (no full-list DOM mount). */
function buildVisibleGallerySlice(
  cachedFiles: GalleryFile[],
  loadedCount: number
): VisibleGallerySlice {
  if (cachedFiles.length === 0 || loadedCount === 0) {
    return { head: [], tail: [], midSpacerPx: 0 };
  }

  const loaded = cachedFiles.slice(0, Math.min(loadedCount, cachedFiles.length));

  if (loadedCount <= MAX_VISIBLE) {
    return { head: loaded, tail: [], midSpacerPx: 0 };
  }

  const head = loaded.slice(0, PAGE_SIZE);
  const tailStart = Math.max(PAGE_SIZE, loadedCount - PAGE_SIZE - VISIBLE_BUFFER);
  const tail = loaded.slice(tailStart, loadedCount);
  const midHiddenCount = Math.max(0, tailStart - PAGE_SIZE);
  const midSpacerPx = midHiddenCount * GALLERY_ROW_HEIGHT_PX;

  return { head, tail, midSpacerPx };
}

function galleryFileMetadataFromMaps(
  path: string,
  galleryIdByPath: Map<string, string | null>,
  ownerTypeByPath: Map<string, string | null>,
  ownerIdByPath: Map<string, string | null>,
  folderIdByPath: Map<string, string | null>
): Pick<GalleryFile, "galleryId" | "ownerType" | "ownerId" | "folderId"> {
  return {
    galleryId: galleryIdByPath.get(path) ?? null,
    ownerType: ownerTypeByPath.get(path) ?? null,
    ownerId: ownerIdByPath.get(path) ?? null,
    folderId: folderIdByPath.get(path) ?? null,
  };
}

/** Reuse GalleryFile instances when storage_path + signedUrl are unchanged. */
function memoizeGalleryFiles(
  cache: Map<string, GalleryFile>,
  batchPaths: string[],
  signed: SignedGalleryFile[],
  galleryIdByPath: Map<string, string | null>,
  ownerTypeByPath: Map<string, string | null>,
  ownerIdByPath: Map<string, string | null>,
  folderIdByPath: Map<string, string | null>
): GalleryFile[] {
  const signedByPath = new Map(signed.map((file) => [file.path, file]));
  const memoized: GalleryFile[] = [];

  for (const path of batchPaths) {
    const row = signedByPath.get(path);
    if (!row) {
      continue;
    }

    const metadata = galleryFileMetadataFromMaps(
      path,
      galleryIdByPath,
      ownerTypeByPath,
      ownerIdByPath,
      folderIdByPath
    );
    const existing = cache.get(path);

    if (existing && existing.url === row.url) {
      const merged: GalleryFile =
        existing.galleryId === metadata.galleryId &&
        existing.ownerType === metadata.ownerType &&
        existing.ownerId === metadata.ownerId &&
        existing.folderId === metadata.folderId
          ? existing
          : { ...existing, ...metadata };
      cache.set(path, merged);
      memoized.push(merged);
      continue;
    }

    const next: GalleryFile = {
      path,
      name: row.name,
      url: row.url,
      ...metadata,
    };
    cache.set(path, next);
    memoized.push(next);
  }

  return memoized;
}

function GalleryGridThumbnail({
  file,
  globalIndex,
  staggerWindow,
  isSelected,
  onToggleSelect,
  selectionDisabled,
}: {
  file: GalleryFile;
  globalIndex: number;
  staggerWindow: StaggerWindow;
  isSelected: boolean;
  onToggleSelect: (item: GallerySelectionItem) => void;
  selectionDisabled: boolean;
}) {
  const selectable = file.galleryId !== null;
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inStaggerBatch = globalIndex >= staggerWindow.start;
  const staggerIndex = globalIndex - staggerWindow.start;
  const staggerDelayMs = inStaggerBatch ? staggerIndex * STAGGER_STEP_MS : 0;

  useEffect(() => {
    if (inStaggerBatch) {
      return;
    }
    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete) {
      setLoaded(true);
    }
  }, [file.url, inStaggerBatch]);

  const imgStyle = inStaggerBatch
    ? { animationDelay: `${staggerDelayMs}ms` }
    : undefined;

  const image = inStaggerBatch ? (
    <img
      key={`${staggerWindow.epoch}-${file.path}`}
      ref={imgRef}
      src={file.url}
      alt=""
      className="gallery-grid-img gallery-grid-img--stagger"
      style={imgStyle}
      loading="lazy"
    />
  ) : (
    <img
      ref={imgRef}
      src={file.url}
      alt=""
      className={
        loaded ? "gallery-grid-img gallery-grid-img--loaded" : "gallery-grid-img"
      }
      loading="lazy"
      onLoad={() => setLoaded(true)}
    />
  );

  return (
    <>
      <input
        type="checkbox"
        className="gallery-grid-checkbox"
        checked={isSelected}
        disabled={!selectable || selectionDisabled}
        aria-label={
          selectable ? `Select ${file.name}` : `${file.name} (no gallery record)`
        }
        title={
          selectable
            ? isSelected
              ? "Deselect"
              : "Select"
            : "Cannot select — missing gallery record"
        }
        onChange={(e) => {
          e.stopPropagation();
          if (file.galleryId) {
            onToggleSelect({ id: file.galleryId, filePath: file.path });
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {image}
    </>
  );
}

function resolveDeleteFileNames(
  items: GallerySelectionItem[],
  cachedFiles: GalleryFile[]
): string[] {
  const names: string[] = [];
  for (const item of items) {
    const file = cachedFiles.find((f) => f.galleryId === item.id);
    const fromPath = item.filePath.split("/").pop()?.trim();
    const name = file?.name?.trim() || fromPath;
    if (name) {
      names.push(name);
    }
  }
  return names;
}

function DeleteConfirmModal({
  open,
  fileNames,
  itemCount,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  fileNames: string[];
  itemCount: number;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="gallery-folder-modal-backdrop"
      role="presentation"
      onClick={deleting ? undefined : onClose}
    >
      <div
        className="gallery-folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-gallery-item-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-gallery-item-title"
          className="gallery-folder-modal-title"
        >
          Delete item?
        </h2>

        <p className="dashboard-subtitle" style={{ margin: "0 0 12px" }}>
          Are you sure you want to delete this item? This action cannot be
          undone.
        </p>

        {itemCount > 1 ? (
          <p className="dashboard-subtitle" style={{ margin: "0 0 8px" }}>
            {itemCount} items selected
          </p>
        ) : null}

        {fileNames.length > 0 ? (
          <ul
            className="dashboard-subtitle"
            style={{ margin: "0 0 16px", paddingLeft: "1.25rem" }}
          >
            {fileNames.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ul>
        ) : null}

        <div className="gallery-folder-modal-actions">
          <button
            type="button"
            className="gallery-folder-modal-btn-secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="gallery-bulk-btn gallery-bulk-btn--danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GalleryInlineSelectionActions({
  count,
  onClear,
  onDeleteSelected,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onDeleteSelected: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="gallery-toolbar-selection"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="gallery-toolbar-selection-count">
        {count} selected
      </span>
      <button
        type="button"
        className="gallery-bulk-btn"
        onClick={onClear}
        disabled={deleting}
      >
        Clear selection
      </button>
      <button
        type="button"
        className="gallery-bulk-btn gallery-bulk-btn--danger"
        onClick={onDeleteSelected}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete selected"}
      </button>
    </div>
  );
}

function CreateFolderModal({
  open,
  name,
  error,
  creating,
  onNameChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  error: string | null;
  creating: boolean;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, creating, onClose]);

  if (!open) {
    return null;
  }

  const trimmed = name.trim();

  return (
    <div
      className="gallery-folder-modal-backdrop"
      role="presentation"
      onClick={creating ? undefined : onClose}
    >
      <div
        className="gallery-folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-folder-title" className="gallery-folder-modal-title">
          Create Folder
        </h2>

        <form className="gallery-folder-modal-form" onSubmit={onSubmit}>
          <div className="gallery-folder-modal-field">
            <label htmlFor="create-folder-name">Folder name</label>
            <input
              ref={inputRef}
              id="create-folder-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Folder name"
              disabled={creating}
              autoComplete="off"
            />
          </div>

          {error ? (
            <p className="gallery-folder-modal-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="gallery-folder-modal-actions">
            <button
              type="button"
              className="gallery-folder-modal-btn-secondary"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="gallery-folder-modal-btn-primary"
              disabled={creating || !trimmed}
            >
              {creating ? "Creating…" : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GalleryFolderSidebar({
  folders,
  loading,
  evidenceSections,
  evidenceLoading,
  activeFolderId,
  activeEvidenceRecord,
  activeSidebarFilter,
  canMove,
  canCopy,
  moveBlockedByEvidence,
  onOpenMoveFolder,
  onOpenCopyFolder,
  onOpenCreateFolder,
  onSelectAll,
  onSelectFolder,
  onSelectEvidenceRecord,
}: {
  folders: Folder[];
  loading: boolean;
  evidenceSections: EvidenceSection[];
  evidenceLoading: boolean;
  activeFolderId: string | null;
  activeEvidenceRecord: EvidenceRecordFilter | null;
  activeSidebarFilter: ActiveSidebarFilter;
  canMove: boolean;
  canCopy: boolean;
  moveBlockedByEvidence: boolean;
  onOpenMoveFolder: () => void;
  onOpenCopyFolder: () => void;
  onOpenCreateFolder: () => void;
  onSelectAll: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectEvidenceRecord: (record: EvidenceRecordFilter) => void;
}) {
  return (
    <aside className="gallery-folder-sidebar" aria-label="Folders">
      <div className="gallery-folder-sidebar-header">
        <h3 className="gallery-folder-sidebar-header-title">Folders</h3>
        <button
          type="button"
          className="gallery-folder-sidebar-header-btn"
          onClick={onOpenCreateFolder}
        >
          +
        </button>
      </div>
      {folders.length > 0 ? (
        <>
          <button
            type="button"
            className="gallery-folder-sidebar-move-btn"
            onClick={onOpenMoveFolder}
            disabled={!canMove}
          >
            Move Selected to Folder
          </button>
          <button
            type="button"
            className="gallery-folder-sidebar-move-btn"
            onClick={onOpenCopyFolder}
            disabled={!canCopy}
          >
            Copy to Folder
          </button>
          {moveBlockedByEvidence ? (
            <p className="gallery-folder-sidebar-loading">
              Evidence attachments can only be deleted.
            </p>
          ) : null}
        </>
      ) : null}
      <button
        type="button"
        className={
          activeSidebarFilter === null
            ? "gallery-folder-sidebar-all gallery-folder-sidebar-all--active"
            : "gallery-folder-sidebar-all"
        }
        onClick={onSelectAll}
      >
        All Images / Unsorted
      </button>
      {loading ? (
        <p className="gallery-folder-sidebar-loading">Loading…</p>
      ) : folders.length === 0 ? (
        <p className="gallery-folder-sidebar-empty">No folders yet</p>
      ) : (
        <ul className="gallery-folder-sidebar-list" aria-label="Folder list">
          {folders.map((folder) => {
            const isActive =
              activeSidebarFilter === "folder" && activeFolderId === folder.id;
            return (
              <li key={folder.id} className="gallery-folder-sidebar-row">
                <button
                  type="button"
                  className={
                    isActive
                      ? "gallery-folder-sidebar-item gallery-folder-sidebar-item--active"
                      : "gallery-folder-sidebar-item"
                  }
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <span
                    className="gallery-folder-sidebar-icon"
                    aria-hidden
                  >
                    📁
                  </span>
                  <span className="gallery-folder-sidebar-label">
                    {folder.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="gallery-evidence-sidebar">
        <div className="gallery-evidence-sidebar-header">
          <h3 className="gallery-evidence-sidebar-title">Evidence</h3>
        </div>
        {evidenceLoading ? (
          <p className="gallery-folder-sidebar-loading">Loading…</p>
        ) : (
          <div className="gallery-evidence-sidebar-list" aria-label="Evidence list">
            {evidenceSections.map((section) => (
              <div key={section.ownerType} className="gallery-evidence-section">
                <h4 className="gallery-evidence-section-title">{section.title}</h4>
                {section.records.length === 0 ? (
                  <p className="gallery-folder-sidebar-empty">No images</p>
                ) : (
                  <ul className="gallery-evidence-record-list">
                    {section.records.map((record) => {
                      const isActive =
                        activeSidebarFilter === "evidence" &&
                        activeEvidenceRecord?.ownerType === record.ownerType &&
                        activeEvidenceRecord?.ownerId === record.ownerId;
                      return (
                        <li key={`${record.ownerType}:${record.ownerId}`}>
                          <button
                            type="button"
                            className={
                              isActive
                                ? "gallery-folder-sidebar-item gallery-folder-sidebar-item--active gallery-evidence-record-item"
                                : "gallery-folder-sidebar-item gallery-evidence-record-item"
                            }
                            onClick={() =>
                              onSelectEvidenceRecord({
                                ownerType: record.ownerType,
                                ownerId: record.ownerId,
                              })
                            }
                          >
                            <span className="gallery-folder-sidebar-label">
                              {record.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default function GalleryPage() {
  const { state, refresh } = useDashboardState();
  const [allPaths, setAllPaths] = useState<string[]>([]);
  const [cachedFiles, setCachedFiles] = useState<GalleryFile[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteItems, setPendingDeleteItems] = useState<
    GallerySelectionItem[] | null
  >(null);
  const [galleryIdByPath, setGalleryIdByPath] = useState(
    () => new Map<string, string | null>()
  );
  const [ownerTypeByPath, setOwnerTypeByPath] = useState(
    () => new Map<string, string | null>()
  );
  const [error, setError] = useState<string | null>(null);
  const [staggerWindow, setStaggerWindow] = useState<StaggerWindow>({
    start: 0,
    epoch: 0,
  });
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [evidenceSections, setEvidenceSections] = useState<EvidenceSection[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [activeEvidenceRecord, setActiveEvidenceRecord] =
    useState<EvidenceRecordFilter | null>(null);
  const [activeSidebarFilter, setActiveSidebarFilter] =
    useState<ActiveSidebarFilter>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState<string | null>(
    null
  );
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [movingFolder, setMovingFolder] = useState(false);
  const [moveFolderError, setMoveFolderError] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [isCopyFolderOpen, setIsCopyFolderOpen] = useState(false);
  const [copyingFolder, setCopyingFolder] = useState(false);
  const [copyFolderError, setCopyFolderError] = useState<string | null>(null);
  const [copyTargetId, setCopyTargetId] = useState<string | null>(null);
  const [isMarkEvidenceOpen, setIsMarkEvidenceOpen] = useState(false);
  const [markingEvidence, setMarkingEvidence] = useState(false);
  const [markEvidenceError, setMarkEvidenceError] = useState<string | null>(null);
  const [markEvidenceSelection, setMarkEvidenceSelection] =
    useState<EvidenceRecordFilter | null>(null);
  const [markEvidenceTarget, setMarkEvidenceTarget] = useState<{
    galleryId: string;
    imageName: string;
  } | null>(null);
  const scopeRef = useRef<{ userId: string; homeId: string } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const lastPrefetchedStartRef = useRef(-1);
  const fileObjectByPathRef = useRef<Map<string, GalleryFile>>(new Map());
  const galleryIdByPathRef = useRef<Map<string, string | null>>(new Map());
  const ownerTypeByPathRef = useRef<Map<string, string | null>>(new Map());
  const ownerIdByPathRef = useRef<Map<string, string | null>>(new Map());
  const folderIdByPathRef = useRef<Map<string, string | null>>(new Map());
  const galleryLoadGenerationRef = useRef(0);
  const loadingRef = useRef(loading);

  const {
    selectedItems,
    toggleSelect,
    clearSelection,
    syncSelection,
  } = useGallerySelection(
    state?.userId ?? null,
    state?.currentHomeId ?? null
  );

  loadingRef.current = loading;

  const visibleSlice = useMemo(
    () => buildVisibleGallerySlice(cachedFiles, loadedCount),
    [cachedFiles, loadedCount]
  );

  const fileIndexByPath = useMemo(() => {
    const map = new Map<string, number>();
    cachedFiles.forEach((f, index) => map.set(f.path, index));
    return map;
  }, [cachedFiles]);

  const selectedIdSet = useMemo(
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems]
  );

  const ownerTypeByGalleryId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const [path, galleryId] of galleryIdByPath.entries()) {
      if (galleryId) {
        map.set(galleryId, ownerTypeByPath.get(path) ?? null);
      }
    }
    return map;
  }, [galleryIdByPath, ownerTypeByPath]);

  const selectedHasEvidenceItems = useMemo(
    () =>
      selectedItems.some((item) =>
        isEvidenceOwnerType(ownerTypeByGalleryId.get(item.id) ?? null)
      ),
    [selectedItems, ownerTypeByGalleryId]
  );

  const folderIdByGalleryId = useMemo(() => {
    const map = new Map<string, string | null>();
    cachedFiles.forEach((file) => {
      if (file.galleryId) {
        map.set(file.galleryId, file.folderId);
      }
    });
    return map;
  }, [cachedFiles]);

  const canCopyToFolder = useMemo(() => {
    if (selectedItems.length === 0) {
      return false;
    }

    return selectedItems.some((item) => {
      const folderId = folderIdByGalleryId.get(item.id) ?? null;
      const ownerType = ownerTypeByGalleryId.get(item.id) ?? null;
      const inFolder = folderId !== null && folderId !== "";
      const isEvidence = isEvidenceOwnerType(ownerType);
      return inFolder || isEvidence;
    });
  }, [selectedItems, folderIdByGalleryId, ownerTypeByGalleryId]);

  const resolvedActiveFolder = useMemo(
    () => folders.find((folder) => folder.id === activeFolderId) ?? null,
    [folders, activeFolderId]
  );

  const resolvedActiveEvidenceRecord = useMemo(() => {
    if (!activeEvidenceRecord) {
      return null;
    }
    return (
      evidenceSections
        .flatMap((section) => section.records)
        .find(
          (record) =>
            record.ownerType === activeEvidenceRecord.ownerType &&
            record.ownerId === activeEvidenceRecord.ownerId
        ) ?? null
    );
  }, [evidenceSections, activeEvidenceRecord]);

  const isUploadEnabled = useMemo(
    () =>
      activeSidebarFilter === null ||
      (activeSidebarFilter === "folder" && resolvedActiveFolder !== null) ||
      (activeSidebarFilter === "evidence" &&
        resolvedActiveEvidenceRecord !== null &&
        resolvedActiveEvidenceRecord.ownerType !== SNAPSHOT_EVIDENCE_OWNER_TYPE),
    [activeSidebarFilter, resolvedActiveFolder, resolvedActiveEvidenceRecord]
  );

  const uploadButtonLabel = useMemo(() => {
    if (activeSidebarFilter === null) {
      return "Upload to Gallery";
    }
    if (activeSidebarFilter === "folder") {
      return resolvedActiveFolder
        ? `Upload to ${resolvedActiveFolder.name} Folder`
        : "Select a folder to upload";
    }
    return resolvedActiveEvidenceRecord
      ? `Upload to ${resolvedActiveEvidenceRecord.label}`
      : "Select an evidence record";
  }, [
    activeSidebarFilter,
    resolvedActiveFolder,
    resolvedActiveEvidenceRecord,
  ]);

  const availableGalleryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const galleryId of galleryIdByPath.values()) {
      if (galleryId) {
        ids.add(galleryId);
      }
    }
    return ids;
  }, [galleryIdByPath]);

  useEffect(() => {
    syncSelection(availableGalleryIds);
  }, [availableGalleryIds, syncSelection]);

  const loadFolders = useCallback(async () => {
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setFolders([]);
      setFoldersLoading(false);
      return;
    }

    setFoldersLoading(true);

    const result = await fetchFoldersForHome(userId, homeId);
    setFolders(result.ok ? result.folders : []);
    setFoldersLoading(false);
  }, [state?.userId, state?.currentHomeId]);

  const loadEvidenceSections = useCallback(async () => {
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setEvidenceSections([]);
      setEvidenceLoading(false);
      return;
    }

    setEvidenceLoading(true);

    const [
      maintenanceResult,
      communicationResult,
      noteResult,
      complexResult,
      snapshotEvidenceResult,
    ] = await Promise.all([
        supabase
          .from("maintenance_logs")
          .select("id, title, description")
          .eq("user_id", userId)
          .eq("home_id", homeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("apartment_communications")
          .select("id, title, message")
          .eq("user_id", userId)
          .eq("home_id", homeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("notes")
          .select("id, title, content")
          .eq("user_id", userId)
          .eq("home_id", homeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("complex_issues")
          .select("id, title, description")
          .eq("user_id", userId)
          .eq("home_id", homeId)
          .order("created_at", { ascending: false }),
      fetchSnapshotGalleryEvidence(homeId),
    ]);

    const maintenanceRecords: EvidenceRecordItem[] = (
      (maintenanceResult.data as
        | { id: string; title: string | null; description: string | null }[]
        | null) ?? []
    ).map((row) => ({
      ownerType: "maintenance",
      ownerId: row.id,
      label:
        row.title?.trim() ||
        row.description?.trim().slice(0, 40) ||
        "Untitled maintenance",
    }));

    const communicationRecords: EvidenceRecordItem[] = (
      (communicationResult.data as
        | { id: string; title: string | null; message: string | null }[]
        | null) ?? []
    ).map((row) => ({
      ownerType: "communication",
      ownerId: row.id,
      label:
        row.title?.trim() ||
        row.message?.trim().slice(0, 40) ||
        "Untitled communication",
    }));

    const noteRecords: EvidenceRecordItem[] = (
      (noteResult.data as
        | { id: string; title: string | null; content: string | null }[]
        | null) ?? []
    ).map((row) => ({
      ownerType: "note",
      ownerId: row.id,
      label: noteDisplayTitle(row.title, row.content ?? "") || "Untitled note",
    }));

    const complexRecords: EvidenceRecordItem[] = (
      (complexResult.data as
        | { id: string; title: string | null; description: string | null }[]
        | null) ?? []
    ).map((row) => ({
      ownerType: "complex",
      ownerId: row.id,
      label:
        row.title?.trim() ||
        row.description?.trim().slice(0, 40) ||
        "Untitled complex issue",
    }));

    const snapshotRecords: EvidenceRecordItem[] = snapshotEvidenceResult.ok
      ? snapshotEvidenceResult.records.map((record) => ({
          ownerType: record.ownerType,
          ownerId: record.ownerId,
          label: record.label,
        }))
      : [];

    setEvidenceSections([
      {
        ownerType: SNAPSHOT_EVIDENCE_OWNER_TYPE,
        title: "Snapshots",
        records: snapshotRecords,
      },
      { ownerType: "maintenance", title: "Maintenance", records: maintenanceRecords },
      { ownerType: "complex", title: "Complex", records: complexRecords },
      {
        ownerType: "communication",
        title: "Communications",
        records: communicationRecords,
      },
      { ownerType: "note", title: "Notes", records: noteRecords },
    ]);
    setEvidenceLoading(false);
  }, [state?.userId, state?.currentHomeId]);

  const signBatch = useCallback(
    async (userId: string, homeId: string, paths: string[]) => {
      if (paths.length === 0) {
        return [];
      }

      await resolveSignedGalleryUrls(userId, homeId, paths, BUCKET);

      const signed: SignedGalleryFile[] = [];
      for (const path of paths) {
        const url = getValidCachedSignedUrl(userId, homeId, path);
        if (!url) {
          continue;
        }
        signed.push({
          path,
          name: path.slice(path.lastIndexOf("/") + 1),
          url,
        });
      }
      return signed;
    },
    []
  );

  const prefetchSignedUrls = useCallback(
    async (userId: string, homeId: string, pathsToPrefetch: string[]) => {
      if (pathsToPrefetch.length === 0) {
        return;
      }

      await resolveSignedGalleryUrls(userId, homeId, pathsToPrefetch, BUCKET);
    },
    []
  );

  const prefetchNextBatch = useCallback(
    async (
      userId: string,
      homeId: string,
      paths: string[],
      afterLoadedCount: number
    ) => {
      const start = afterLoadedCount;

      if (start >= paths.length || lastPrefetchedStartRef.current === start) {
        return;
      }

      if (isPrefetchingRef.current) {
        return;
      }

      const batch = paths.slice(start, start + PAGE_SIZE);
      if (batch.length === 0) {
        return;
      }

      isPrefetchingRef.current = true;
      lastPrefetchedStartRef.current = start;

      try {
        await prefetchSignedUrls(userId, homeId, batch);
      } catch {
        lastPrefetchedStartRef.current = -1;
      } finally {
        isPrefetchingRef.current = false;
      }
    },
    [prefetchSignedUrls]
  );

  const loadMorePaths = useCallback(
    async (
      userId: string,
      homeId: string,
      paths: string[],
      start: number,
      append: boolean,
      loadGeneration: number
    ): Promise<number> => {
      const batch = paths.slice(start, start + PAGE_SIZE);
      if (batch.length === 0) {
        return start;
      }

      const signed = await signBatch(userId, homeId, batch);
      if (loadGeneration !== galleryLoadGenerationRef.current) {
        return start;
      }

      const memoized = memoizeGalleryFiles(
        fileObjectByPathRef.current,
        batch,
        signed,
        galleryIdByPathRef.current,
        ownerTypeByPathRef.current,
        ownerIdByPathRef.current,
        folderIdByPathRef.current
      );
      const end = start + batch.length;

      await scheduleGalleryDomUpdate(() => {
        if (loadGeneration !== galleryLoadGenerationRef.current) {
          return;
        }
        setCachedFiles((prev) =>
          append ? [...prev, ...memoized] : memoized
        );
        setStaggerWindow((prev) => ({ start, epoch: prev.epoch + 1 }));
        setLoadedCount(end);
      });

      return end;
    },
    [signBatch]
  );

  const resetGallery = useCallback(() => {
    fileObjectByPathRef.current.clear();
    galleryIdByPathRef.current.clear();
    ownerTypeByPathRef.current.clear();
    ownerIdByPathRef.current.clear();
    folderIdByPathRef.current.clear();
    setGalleryIdByPath(new Map());
    setOwnerTypeByPath(new Map());
    setAllPaths([]);
    setCachedFiles([]);
    setLoadedCount(0);
    setStaggerWindow({ start: 0, epoch: 0 });
    clearSelection();
    setError(null);
  }, [clearSelection]);

  const loadInitial = useCallback(async () => {
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId) {
      resetGallery();
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    if (!homeId) {
      resetGallery();
      setLoading(false);
      return;
    }

    const loadGeneration = ++galleryLoadGenerationRef.current;

    const prevScope = scopeRef.current;
    if (prevScope && prevScope.userId !== userId) {
      invalidateSignedUrlCacheForUser(prevScope.userId);
    }
    if (
      prevScope &&
      (prevScope.userId !== userId || prevScope.homeId !== homeId)
    ) {
      invalidateSignedUrlCache(prevScope.userId, prevScope.homeId);
    }
    scopeRef.current = { userId, homeId };

    setLoading(true);
    setError(null);
    fileObjectByPathRef.current.clear();
    galleryIdByPathRef.current.clear();
    ownerTypeByPathRef.current.clear();
    ownerIdByPathRef.current.clear();
    folderIdByPathRef.current.clear();
    setGalleryIdByPath(new Map());
    setOwnerTypeByPath(new Map());
    setCachedFiles([]);
    setLoadedCount(0);
    setStaggerWindow({ start: 0, epoch: 0 });
    lastPrefetchedStartRef.current = -1;

    const isStaleLoad = () => loadGeneration !== galleryLoadGenerationRef.current;

    try {
      if (activeSidebarFilter !== "evidence" && activeFolderId) {
        const galleryMetaResult = await fetchGalleryItemsForHome(
          userId,
          homeId,
          { folderId: activeFolderId }
        );

        if (isStaleLoad()) {
          return;
        }

        if (!galleryMetaResult.ok) {
          setAllPaths([]);
          setError(galleryMetaResult.message);
          return;
        }

        const galleryItems = galleryMetaResult.items;
        const paths = buildPathsFromGalleryItems(galleryItems);
        const displayEntries = buildGalleryDisplayEntriesFromPaths(
          paths,
          galleryItems
        );
        const filteredEntries =
          activeSidebarFilter === "folder" && activeFolderId !== null
            ? displayEntries.filter((entry) => entry.folderId === activeFolderId)
            : displayEntries;
        const filteredPaths = filteredEntries.map((entry) => entry.path);
        const idMap = new Map(
          filteredEntries.map((entry) => [entry.path, entry.galleryId])
        );
        const ownerTypeMap = new Map(
          filteredEntries.map((entry) => [entry.path, entry.ownerType])
        );
        const ownerIdMap = new Map(
          filteredEntries.map((entry) => [entry.path, entry.ownerId])
        );
        const folderIdMap = new Map(
          filteredEntries.map((entry) => [entry.path, entry.folderId])
        );
        galleryIdByPathRef.current = idMap;
        ownerTypeByPathRef.current = ownerTypeMap;
        ownerIdByPathRef.current = ownerIdMap;
        folderIdByPathRef.current = folderIdMap;
        setGalleryIdByPath(idMap);
        setOwnerTypeByPath(ownerTypeMap);
        setAllPaths(filteredPaths);

        if (filteredPaths.length === 0) {
          return;
        }

        const end = await loadMorePaths(
          userId,
          homeId,
          filteredPaths,
          0,
          false,
          loadGeneration
        );
        if (isStaleLoad()) {
          return;
        }
        void prefetchNextBatch(userId, homeId, filteredPaths, end);
        return;
      }

      const [
        { data: listed, error: listError },
        galleryMetaResult,
        snapshotEvidenceResult,
      ] = await Promise.all([
        getCachedStorageList(userId, homeId, "gallery", () =>
          supabase.storage
            .from(BUCKET)
            .list(`${userId}/${homeId}`, { limit: LIST_LIMIT })
        ),
        fetchGalleryItemsForHome(userId, homeId),
        fetchSnapshotGalleryEvidence(homeId),
      ]);

      if (isStaleLoad()) {
        return;
      }

      if (listError) {
        setAllPaths([]);
        setError(listError.message);
        return;
      }

      const paths = buildPathsFromList(listed, userId, homeId);
      const galleryItems = galleryMetaResult.ok ? galleryMetaResult.items : [];
      const snapshotGalleryIds = snapshotEvidenceResult.ok
        ? snapshotEvidenceResult.galleryIdsBySnapshotId
        : new Map<string, Set<string>>();
      const displayEntries = enrichGalleryEntriesWithSnapshotOwnership(
        buildGalleryDisplayEntriesFromPaths(paths, galleryItems),
        snapshotGalleryIds
      );
      const filteredEntries =
        activeSidebarFilter === "evidence" && activeEvidenceRecord !== null
          ? displayEntries.filter(
              (entry) =>
                entry.ownerType === activeEvidenceRecord.ownerType &&
                entry.ownerId === activeEvidenceRecord.ownerId
            )
          : activeSidebarFilter === "folder" && activeFolderId !== null
            ? displayEntries.filter((entry) => entry.folderId === activeFolderId)
            : displayEntries;
      const filteredPaths = filteredEntries.map((entry) => entry.path);
      const idMap = new Map(
        filteredEntries.map((entry) => [entry.path, entry.galleryId])
      );
      const ownerTypeMap = new Map(
        filteredEntries.map((entry) => [entry.path, entry.ownerType])
      );
      const ownerIdMap = new Map(
        filteredEntries.map((entry) => [entry.path, entry.ownerId])
      );
      const folderIdMap = new Map(
        filteredEntries.map((entry) => [entry.path, entry.folderId])
      );
      galleryIdByPathRef.current = idMap;
      ownerTypeByPathRef.current = ownerTypeMap;
      ownerIdByPathRef.current = ownerIdMap;
      folderIdByPathRef.current = folderIdMap;
      setGalleryIdByPath(idMap);
      setOwnerTypeByPath(ownerTypeMap);
      setAllPaths(filteredPaths);

      if (filteredPaths.length === 0) {
        return;
      }

      const end = await loadMorePaths(
        userId,
        homeId,
        filteredPaths,
        0,
        false,
        loadGeneration
      );
      if (isStaleLoad()) {
        return;
      }
      void prefetchNextBatch(userId, homeId, filteredPaths, end);
    } catch (err) {
      if (isStaleLoad()) {
        return;
      }
      setAllPaths([]);
      setError(
        err instanceof Error ? err.message : "Could not load gallery images."
      );
    } finally {
      if (loadGeneration === galleryLoadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [
    state,
    resetGallery,
    loadMorePaths,
    prefetchNextBatch,
    activeFolderId,
    activeEvidenceRecord,
    activeSidebarFilter,
  ]);

  const refetchGallery = loadInitial;

  const closeDeleteConfirmModal = useCallback(() => {
    if (bulkDeleting) {
      return;
    }
    setDeleteConfirmOpen(false);
    setPendingDeleteItems(null);
  }, [bulkDeleting]);

  const openDeleteConfirmModal = useCallback(() => {
    if (selectedItems.length === 0 || bulkDeleting) {
      return;
    }
    setPendingDeleteItems([...selectedItems]);
    setDeleteConfirmOpen(true);
  }, [selectedItems, bulkDeleting]);

  const pendingDeleteFileNames = useMemo(() => {
    if (!pendingDeleteItems?.length) {
      return [];
    }
    return resolveDeleteFileNames(pendingDeleteItems, cachedFiles);
  }, [pendingDeleteItems, cachedFiles]);

  const handleBulkDelete = useCallback(async (itemsToDelete: GallerySelectionItem[]) => {
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setError("Not signed in.");
      return;
    }

    if (itemsToDelete.length === 0 || bulkDeleting) {
      return;
    }
    setBulkDeleting(true);
    setError(null);

    const results = await Promise.allSettled(
      itemsToDelete.map((item) =>
        deleteGalleryItem({
          galleryId: item.id,
          filePath: item.filePath,
          userId,
          homeId,
        })
      )
    );

    const succeededIds = new Set<string>();
    let failedCount = 0;

    results.forEach((result, index) => {
      const item = itemsToDelete[index];
      if (result.status === "fulfilled" && result.value.ok) {
        succeededIds.add(item.id);
        return;
      }
      failedCount += 1;
    });

    if (succeededIds.size > 0) {
      setAllPaths((prev) => {
        const next = prev.filter((path) => {
          const galleryId = galleryIdByPathRef.current.get(path);
          return !galleryId || !succeededIds.has(galleryId);
        });
        setLoadedCount((count) => Math.min(count, next.length));
        return next;
      });
      setCachedFiles((prev) =>
        prev.filter((file) => {
          if (!file.galleryId) {
            return true;
          }
          return !succeededIds.has(file.galleryId);
        })
      );
      for (const [path, galleryId] of galleryIdByPathRef.current.entries()) {
        if (galleryId && succeededIds.has(galleryId)) {
          galleryIdByPathRef.current.delete(path);
          ownerTypeByPathRef.current.delete(path);
          ownerIdByPathRef.current.delete(path);
          folderIdByPathRef.current.delete(path);
          fileObjectByPathRef.current.delete(path);
        }
      }
      setGalleryIdByPath(new Map(galleryIdByPathRef.current));
      setOwnerTypeByPath(new Map(ownerTypeByPathRef.current));
    }

    clearSelection();
    setBulkDeleting(false);

    const succeededCount = succeededIds.size;
    const summary = `Deleted ${succeededCount} of ${itemsToDelete.length} image${
      itemsToDelete.length === 1 ? "" : "s"
    }.`;
    console.info("[gallery] bulk delete", {
      requested: itemsToDelete.length,
      succeeded: succeededCount,
      failed: failedCount,
    });

    if (failedCount > 0) {
      setError(
        failedCount === itemsToDelete.length
          ? `Could not delete selected images. ${summary}`
          : `${summary} ${failedCount} failed — refreshing gallery.`
      );
      await refetchGallery();
      return;
    }

    if (succeededCount > 0) {
      setError(null);
    }
  }, [
    state?.userId,
    state?.currentHomeId,
    bulkDeleting,
    clearSelection,
    refetchGallery,
  ]);

  const confirmPendingDelete = useCallback(async () => {
    const items = pendingDeleteItems;
    if (!items?.length || bulkDeleting) {
      return;
    }
    setDeleteConfirmOpen(false);
    await handleBulkDelete(items);
    setPendingDeleteItems(null);
  }, [pendingDeleteItems, bulkDeleting, handleBulkDelete]);

  useEffect(() => {
    if (!state?.userId) {
      return;
    }

    void loadInitial();
  }, [state, loadInitial]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    void loadEvidenceSections();
  }, [loadEvidenceSections]);

  useEffect(() => {
    setActiveFolderId(null);
    setActiveEvidenceRecord(null);
    setActiveSidebarFilter(null);
  }, [state?.currentHomeId]);

  useEffect(() => {
    if (!activeEvidenceRecord) {
      return;
    }
    const stillExists = evidenceSections.some((section) =>
      section.records.some(
        (record) =>
          record.ownerType === activeEvidenceRecord.ownerType &&
          record.ownerId === activeEvidenceRecord.ownerId
      )
    );
    if (!stillExists) {
      setActiveEvidenceRecord(null);
      if (activeSidebarFilter === "evidence") {
        setActiveSidebarFilter(null);
      }
    }
  }, [evidenceSections, activeEvidenceRecord, activeSidebarFilter]);

  const closeCreateFolderModal = useCallback(() => {
    if (creatingFolder) {
      return;
    }

    setIsCreateFolderOpen(false);
    setNewFolderName("");
    setCreateFolderError(null);
  }, [creatingFolder]);

  const openCreateFolderModal = useCallback(() => {
    setNewFolderName("");
    setCreateFolderError(null);
    setIsCreateFolderOpen(true);
  }, []);

  const handleCreateFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setCreateFolderError("Select an active home before creating a folder.");
      return;
    }

    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setCreateFolderError("Please enter a folder name.");
      return;
    }

    setCreatingFolder(true);
    setCreateFolderError(null);

    const result = await createFolder(userId, homeId, trimmed);

    if (!result.ok) {
      setCreatingFolder(false);
      setCreateFolderError(result.message);
      return;
    }

    setCreatingFolder(false);
    setIsCreateFolderOpen(false);
    setNewFolderName("");
    setCreateFolderError(null);
    await loadFolders();
  };

  const closeMoveFolderModal = useCallback(() => {
    if (movingFolder) {
      return;
    }
    setIsMoveFolderOpen(false);
    setMoveFolderError(null);
    setMoveTargetId(null);
  }, [movingFolder]);

  const openMoveFolderModal = useCallback(() => {
    if (folders.length === 0 || selectedItems.length === 0) {
      return;
    }
    setMoveFolderError(null);
    setMoveTargetId(activeFolderId ?? null);
    setIsMoveFolderOpen(true);
  }, [folders.length, selectedItems.length, activeFolderId]);

  const handleMoveFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setMoveFolderError("Select an active home before moving images.");
      return;
    }

    if (selectedItems.length === 0) {
      setMoveFolderError("Select at least one image to move.");
      return;
    }

    if (selectedHasEvidenceItems) {
      setMoveFolderError("Evidence-linked images cannot be moved to folders.");
      return;
    }

    const targetFolderId = moveTargetId ?? null;

    const galleryIds = selectedItems.map((item) => item.id).filter(Boolean);
    if (galleryIds.length === 0) {
      setMoveFolderError("Selected images are no longer available.");
      return;
    }

    setMovingFolder(true);
    setMoveFolderError(null);

    const result = await moveGalleryItemsToFolder({
      userId,
      homeId,
      galleryIds,
      folderId: targetFolderId,
    });

    if (!result.ok) {
      setMovingFolder(false);
      setMoveFolderError(result.message);
      return;
    }

    setMovingFolder(false);
    setIsMoveFolderOpen(false);
    setMoveFolderError(null);
    setMoveTargetId(null);
    clearSelection();
    await refetchGallery();
  };

  const closeCopyFolderModal = useCallback(() => {
    if (copyingFolder) {
      return;
    }
    setIsCopyFolderOpen(false);
    setCopyFolderError(null);
    setCopyTargetId(null);
  }, [copyingFolder]);

  const openCopyFolderModal = useCallback(() => {
    if (folders.length === 0 || selectedItems.length === 0) {
      return;
    }
    setCopyFolderError(null);
    setCopyTargetId(activeFolderId ?? null);
    setIsCopyFolderOpen(true);
  }, [folders.length, selectedItems.length, activeFolderId]);

  const handleCopyFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setCopyFolderError("Select an active home before copying images.");
      return;
    }

    if (selectedItems.length === 0) {
      setCopyFolderError("Select at least one image to copy.");
      return;
    }

    const targetFolderId = copyTargetId ?? null;
    const ids = selectedItems.map((item) => item.id).filter(Boolean);
    if (ids.length === 0) {
      setCopyFolderError("Selected images are no longer available.");
      return;
    }

    setCopyingFolder(true);
    setCopyFolderError(null);

    const result = await copyGalleryItemsToFolder({
      userId,
      homeId,
      galleryIds: ids,
      folderId: targetFolderId,
    });

    if (!result.ok) {
      setCopyingFolder(false);
      setCopyFolderError(result.message);
      return;
    }

    setCopyingFolder(false);
    setIsCopyFolderOpen(false);
    setCopyFolderError(null);
    setCopyTargetId(null);
    clearSelection();
    await refetchGallery();
  };

  const closeMarkEvidenceModal = useCallback(() => {
    if (markingEvidence) {
      return;
    }
    setIsMarkEvidenceOpen(false);
    setMarkEvidenceError(null);
    setMarkEvidenceSelection(null);
    setMarkEvidenceTarget(null);
  }, [markingEvidence]);

  const canShowMarkAsEvidence = useCallback(
    (file: GalleryFile) => {
      if (activeSidebarFilter === "evidence" || file.galleryId === null) {
        return false;
      }
      const ownerType = ownerTypeByPath.get(file.path) ?? file.ownerType;
      return ownerType === null;
    },
    [activeSidebarFilter, ownerTypeByPath]
  );

  const openMarkEvidenceModal = useCallback(
    (file: GalleryFile) => {
      if (activeSidebarFilter === "evidence") {
        return;
      }
      const ownerType = ownerTypeByPath.get(file.path) ?? file.ownerType;
      if (!file.galleryId || ownerType !== null) {
        return;
      }
      setMarkEvidenceError(null);
      setMarkEvidenceSelection(null);
      setMarkEvidenceTarget({
        galleryId: file.galleryId,
        imageName: file.name,
      });
      setIsMarkEvidenceOpen(true);
    },
    [activeSidebarFilter, ownerTypeByPath]
  );

  const handleMarkEvidenceSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setMarkEvidenceError("Select an active home before marking evidence.");
      return;
    }
    if (!markEvidenceTarget) {
      setMarkEvidenceError("Select an image to mark as evidence.");
      return;
    }
    if (!markEvidenceSelection) {
      setMarkEvidenceError("Select a record for this evidence image.");
      return;
    }

    setMarkingEvidence(true);
    setMarkEvidenceError(null);

    const result = await markGalleryAsEvidence({
      userId,
      homeId,
      galleryId: markEvidenceTarget.galleryId,
      ownerType: markEvidenceSelection.ownerType,
      ownerId: markEvidenceSelection.ownerId,
    });

    if (!result.ok) {
      setMarkingEvidence(false);
      setMarkEvidenceError(result.message);
      return;
    }

    setMarkingEvidence(false);
    setIsMarkEvidenceOpen(false);
    setMarkEvidenceSelection(null);
    setMarkEvidenceTarget(null);
    setMarkEvidenceError(null);
    await refetchGallery();
  };

  const loadNextBatch = useCallback(async () => {
    if (isLoadingMoreRef.current || loadingRef.current) {
      return;
    }

    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId || loadedCount >= allPaths.length) {
      return;
    }

    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const end = await loadMorePaths(
        userId,
        homeId,
        allPaths,
        loadedCount,
        true,
        galleryLoadGenerationRef.current
      );
      void prefetchNextBatch(userId, homeId, allPaths, end);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load more images."
      );
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [state, allPaths, loadedCount, loadMorePaths, prefetchNextBatch]);

  const hasMore = loadedCount < allPaths.length;
  const showGrid = !loading && cachedFiles.length > 0;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !showGrid || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextBatch();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [showGrid, hasMore, loadNextBatch, loadedCount]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isUploadEnabled) {
      e.target.value = "";
      return;
    }

    const fileList = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!fileList.length) return;

    const uploadContextSnapshot = {
      mode: activeSidebarFilter,
      folderId: activeFolderId,
      evidenceRecord: activeEvidenceRecord,
    };

    setUploading(true);
    setError(null);

    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId) {
      setError("Not signed in.");
      setUploading(false);
      return;
    }

    if (!homeId) {
      setError("No active home selected");
      setUploading(false);
      return;
    }

    let uploadContext: UploadGalleryContext = "gallery";
    let uploadOwnerId: string | undefined;
    let uploadFolderId: string | undefined;
    let uploadLogContext = "gallery";

    if (
      uploadContextSnapshot.mode === "evidence" &&
      uploadContextSnapshot.evidenceRecord &&
      uploadContextSnapshot.evidenceRecord.ownerType !==
        SNAPSHOT_EVIDENCE_OWNER_TYPE
    ) {
      uploadContext = uploadContextSnapshot.evidenceRecord.ownerType;
      uploadOwnerId = uploadContextSnapshot.evidenceRecord.ownerId;
      uploadLogContext = uploadContextSnapshot.evidenceRecord.ownerType;
    } else if (
      uploadContextSnapshot.mode === "folder" &&
      uploadContextSnapshot.folderId
    ) {
      uploadContext = "gallery";
      uploadFolderId = uploadContextSnapshot.folderId;
      uploadLogContext = "gallery";
    }

    const uploadResult = await uploadFilesToGallery({
      userId,
      homeId,
      files: fileList,
      logContext: uploadLogContext,
      context: uploadContext,
      ownerId: uploadOwnerId,
      folderId: uploadFolderId,
    });

    if (!uploadResult.ok) {
      setError(uploadResult.message);
      setUploading(false);
      return;
    }

    invalidateStorageCache(userId, homeId);
    invalidateSignedUrlCache(userId, homeId);
    setUploading(false);
    await loadInitial();
    await refresh();
  };

  return (
    <div className="dashboard-container gallery-page">
      <h1 className="dashboard-title">Gallery</h1>

      <PlanUsageHints variant="storage-only" />

      {error ? (
        <p className="gallery-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="gallery-page-layout">
        <div className="gallery-page-main">
          <section
            className="dashboard-card gallery-toolbar"
            aria-label="Gallery actions"
          >
            <input
              id="gallery-upload-input"
              type="file"
              accept="image/*"
              multiple
              className="gallery-file-input"
              onChange={handleFileChange}
              disabled={uploading || !isUploadEnabled}
            />
            <div className="gallery-toolbar-row">
              <div className="gallery-toolbar-upload">
                <label
                  htmlFor={
                    uploading || !isUploadEnabled
                      ? undefined
                      : "gallery-upload-input"
                  }
                  className="dashboard-btn-primary gallery-toolbar-upload-btn"
                  style={
                    uploading || !isUploadEnabled
                      ? {
                          opacity: 0.6,
                          pointerEvents: "none",
                          cursor: "not-allowed",
                        }
                      : { cursor: "pointer", display: "inline-block" }
                  }
                >
                  {uploading ? "Uploading…" : uploadButtonLabel}
                </label>
              </div>
              {selectedItems.length > 0 ? (
                <GalleryInlineSelectionActions
                  count={selectedItems.length}
                  onClear={clearSelection}
                  onDeleteSelected={openDeleteConfirmModal}
                  deleting={bulkDeleting}
                />
              ) : null}
            </div>
          </section>

          {!loading && cachedFiles.length === 0 ? (
            <p className="dashboard-subtitle" style={{ margin: "16px 0 0" }}>
              No images uploaded
            </p>
          ) : null}

          {showGrid ? (
            <ul
              className="gallery-grid"
              aria-label="Gallery thumbnails"
              style={{ marginTop: 16 }}
            >
              {visibleSlice.head.map((file) => {
                const isSelected =
                  file.galleryId != null && selectedIdSet.has(file.galleryId);
                const selectable = file.galleryId != null && !bulkDeleting;
                const canMarkAsEvidence = canShowMarkAsEvidence(file);

                return (
                  <li
                    key={`head-${file.path}`}
                    className={
                      isSelected
                        ? "gallery-grid-item gallery-grid-item--selected gallery-grid-item--selectable"
                        : selectable
                          ? "gallery-grid-item gallery-grid-item--selectable"
                          : "gallery-grid-item"
                    }
                    onClick={() => {
                      if (file.galleryId && !bulkDeleting) {
                        toggleSelect({
                          id: file.galleryId,
                          filePath: file.path,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        !file.galleryId ||
                        bulkDeleting ||
                        (e.key !== "Enter" && e.key !== " ")
                      ) {
                        return;
                      }
                      e.preventDefault();
                      toggleSelect({
                        id: file.galleryId,
                        filePath: file.path,
                      });
                    }}
                    role={selectable ? "button" : undefined}
                    tabIndex={selectable ? 0 : undefined}
                    aria-pressed={selectable ? isSelected : undefined}
                  >
                    {canMarkAsEvidence ? (
                      <button
                        type="button"
                        className="gallery-grid-mark-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openMarkEvidenceModal(file);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        Mark as Evidence
                      </button>
                    ) : null}
                    <GalleryGridThumbnail
                      file={file}
                      globalIndex={fileIndexByPath.get(file.path) ?? 0}
                      staggerWindow={staggerWindow}
                      isSelected={isSelected}
                      onToggleSelect={toggleSelect}
                      selectionDisabled={bulkDeleting}
                    />
                  </li>
                );
              })}
              {visibleSlice.midSpacerPx > 0 ? (
                <li
                  key="gallery-mid-spacer"
                  aria-hidden
                  className="gallery-grid-spacer"
                  style={{
                    gridColumn: "1 / -1",
                    height: visibleSlice.midSpacerPx,
                    margin: 0,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    listStyle: "none",
                  }}
                />
              ) : null}
              {visibleSlice.tail.map((file) => {
                const isSelected =
                  file.galleryId != null && selectedIdSet.has(file.galleryId);
                const selectable = file.galleryId != null && !bulkDeleting;
                const canMarkAsEvidence = canShowMarkAsEvidence(file);

                return (
                  <li
                    key={`tail-${file.path}`}
                    className={
                      isSelected
                        ? "gallery-grid-item gallery-grid-item--selected gallery-grid-item--selectable"
                        : selectable
                          ? "gallery-grid-item gallery-grid-item--selectable"
                          : "gallery-grid-item"
                    }
                    onClick={() => {
                      if (file.galleryId && !bulkDeleting) {
                        toggleSelect({
                          id: file.galleryId,
                          filePath: file.path,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        !file.galleryId ||
                        bulkDeleting ||
                        (e.key !== "Enter" && e.key !== " ")
                      ) {
                        return;
                      }
                      e.preventDefault();
                      toggleSelect({
                        id: file.galleryId,
                        filePath: file.path,
                      });
                    }}
                    role={selectable ? "button" : undefined}
                    tabIndex={selectable ? 0 : undefined}
                    aria-pressed={selectable ? isSelected : undefined}
                  >
                    {canMarkAsEvidence ? (
                      <button
                        type="button"
                        className="gallery-grid-mark-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openMarkEvidenceModal(file);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        Mark as Evidence
                      </button>
                    ) : null}
                    <GalleryGridThumbnail
                      file={file}
                      globalIndex={fileIndexByPath.get(file.path) ?? 0}
                      staggerWindow={staggerWindow}
                      isSelected={isSelected}
                      onToggleSelect={toggleSelect}
                      selectionDisabled={bulkDeleting}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showGrid && hasMore ? (
            <div
              ref={loadMoreRef}
              aria-hidden
              style={{ height: 1, width: "100%", marginTop: 8 }}
            />
          ) : null}

          {showGrid && hasMore ? (
            <p
              className={
                loadingMore
                  ? "dashboard-subtitle gallery-loading-more gallery-loading-more--visible"
                  : "dashboard-subtitle gallery-loading-more"
              }
              aria-live="polite"
            >
              {loadingMore ? "Loading more…" : "\u00a0"}
            </p>
          ) : null}
        </div>

        <GalleryFolderSidebar
          folders={folders}
          loading={foldersLoading}
          evidenceSections={evidenceSections}
          evidenceLoading={evidenceLoading}
          activeFolderId={activeFolderId}
          activeEvidenceRecord={activeEvidenceRecord}
          activeSidebarFilter={activeSidebarFilter}
          canMove={selectedItems.length > 0 && !selectedHasEvidenceItems}
          canCopy={canCopyToFolder}
          moveBlockedByEvidence={selectedItems.length > 0 && selectedHasEvidenceItems}
          onOpenMoveFolder={openMoveFolderModal}
          onOpenCopyFolder={openCopyFolderModal}
          onOpenCreateFolder={openCreateFolderModal}
          onSelectAll={() => {
            setActiveFolderId(null);
            setActiveEvidenceRecord(null);
            setActiveSidebarFilter(null);
          }}
          onSelectFolder={(folderId) => {
            setActiveFolderId(folderId);
            setActiveSidebarFilter("folder");
          }}
          onSelectEvidenceRecord={(record) => {
            setActiveEvidenceRecord(record);
            setActiveSidebarFilter("evidence");
          }}
        />
      </div>

      <CreateFolderModal
        open={isCreateFolderOpen}
        name={newFolderName}
        error={createFolderError}
        creating={creatingFolder}
        onNameChange={setNewFolderName}
        onClose={closeCreateFolderModal}
        onSubmit={(e) => void handleCreateFolderSubmit(e)}
      />

      <DeleteConfirmModal
        open={deleteConfirmOpen}
        fileNames={pendingDeleteFileNames}
        itemCount={pendingDeleteItems?.length ?? 0}
        deleting={bulkDeleting}
        onClose={closeDeleteConfirmModal}
        onConfirm={() => void confirmPendingDelete()}
      />

      {isMarkEvidenceOpen ? (
        <div
          className="gallery-folder-modal-backdrop"
          role="presentation"
          onClick={markingEvidence ? undefined : closeMarkEvidenceModal}
        >
          <div
            className="gallery-folder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-evidence-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mark-evidence-title" className="gallery-folder-modal-title">
              Mark as Evidence
            </h2>
            {markEvidenceTarget ? (
              <p className="dashboard-subtitle" style={{ margin: "0 0 10px" }}>
                {markEvidenceTarget.imageName}
              </p>
            ) : null}

            <form
              className="gallery-folder-modal-form"
              onSubmit={(e) => void handleMarkEvidenceSubmit(e)}
            >
              <div className="gallery-evidence-mark-sections">
                {evidenceSections
                  .filter(
                    (section) => section.ownerType !== SNAPSHOT_EVIDENCE_OWNER_TYPE
                  )
                  .map((section) => (
                  <div key={section.ownerType} className="gallery-evidence-section">
                    <h4 className="gallery-evidence-section-title">{section.title}</h4>
                    {section.records.length === 0 ? (
                      <p className="gallery-folder-sidebar-empty">No records</p>
                    ) : (
                      <div className="gallery-folder-move-options">
                        {section.records.map((record) => (
                          <button
                            key={`${record.ownerType}:${record.ownerId}`}
                            type="button"
                            className={
                              markEvidenceSelection?.ownerType ===
                                record.ownerType &&
                              markEvidenceSelection?.ownerId === record.ownerId
                                ? "gallery-folder-move-option gallery-folder-move-option--active"
                                : "gallery-folder-move-option"
                            }
                            onClick={() =>
                              setMarkEvidenceSelection({
                                ownerType: record.ownerType,
                                ownerId: record.ownerId,
                              })
                            }
                            disabled={markingEvidence}
                          >
                            <span className="gallery-folder-sidebar-label">
                              {record.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {markEvidenceError ? (
                <p className="gallery-folder-modal-error" role="alert">
                  {markEvidenceError}
                </p>
              ) : null}

              <div className="gallery-folder-modal-actions">
                <button
                  type="button"
                  className="gallery-folder-modal-btn-secondary"
                  onClick={closeMarkEvidenceModal}
                  disabled={markingEvidence}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gallery-folder-modal-btn-primary"
                  disabled={markingEvidence || !markEvidenceSelection}
                >
                  {markingEvidence ? "Saving…" : "Mark as Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMoveFolderOpen ? (
        <div
          className="gallery-folder-modal-backdrop"
          role="presentation"
          onClick={movingFolder ? undefined : closeMoveFolderModal}
        >
          <div
            className="gallery-folder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-folder-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="move-folder-title" className="gallery-folder-modal-title">
              Move to Folder
            </h2>

            <form
              className="gallery-folder-modal-form"
              onSubmit={(e) => void handleMoveFolderSubmit(e)}
            >
              <div className="gallery-folder-modal-field">
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#555",
                  }}
                >
                  Choose a folder for the selected images.
                </p>
              </div>

              <div className="gallery-folder-move-options">
                <button
                  type="button"
                  className={
                    moveTargetId === null
                      ? "gallery-folder-move-option gallery-folder-move-option--active"
                      : "gallery-folder-move-option"
                  }
                  onClick={() => setMoveTargetId(null)}
                  disabled={movingFolder}
                >
                  <span className="gallery-folder-sidebar-icon" aria-hidden>
                    📁
                  </span>
                  <span className="gallery-folder-sidebar-label">
                    All Images / Unsorted
                  </span>
                </button>

                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={
                      moveTargetId === folder.id
                        ? "gallery-folder-move-option gallery-folder-move-option--active"
                        : "gallery-folder-move-option"
                    }
                    onClick={() => setMoveTargetId(folder.id)}
                    disabled={movingFolder}
                  >
                    <span className="gallery-folder-sidebar-icon" aria-hidden>
                      📁
                    </span>
                    <span className="gallery-folder-sidebar-label">
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>

              {moveFolderError ? (
                <p className="gallery-folder-modal-error" role="alert">
                  {moveFolderError}
                </p>
              ) : null}

              <div className="gallery-folder-modal-actions">
                <button
                  type="button"
                  className="gallery-folder-modal-btn-secondary"
                  onClick={closeMoveFolderModal}
                  disabled={movingFolder}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gallery-folder-modal-btn-primary"
                  disabled={movingFolder}
                >
                  {movingFolder ? "Moving…" : "Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCopyFolderOpen ? (
        <div
          className="gallery-folder-modal-backdrop"
          role="presentation"
          onClick={copyingFolder ? undefined : closeCopyFolderModal}
        >
          <div
            className="gallery-folder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-folder-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="copy-folder-title" className="gallery-folder-modal-title">
              Copy to Folder
            </h2>

            <form
              className="gallery-folder-modal-form"
              onSubmit={(e) => void handleCopyFolderSubmit(e)}
            >
              <div className="gallery-folder-modal-field">
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#555",
                  }}
                >
                  Create a new gallery entry in the chosen folder. The original
                  image is not moved or duplicated in storage.
                </p>
              </div>

              <div className="gallery-folder-move-options">
                <button
                  type="button"
                  className={
                    copyTargetId === null
                      ? "gallery-folder-move-option gallery-folder-move-option--active"
                      : "gallery-folder-move-option"
                  }
                  onClick={() => setCopyTargetId(null)}
                  disabled={copyingFolder}
                >
                  <span className="gallery-folder-sidebar-icon" aria-hidden>
                    📁
                  </span>
                  <span className="gallery-folder-sidebar-label">
                    All Images / Unsorted
                  </span>
                </button>

                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={
                      copyTargetId === folder.id
                        ? "gallery-folder-move-option gallery-folder-move-option--active"
                        : "gallery-folder-move-option"
                    }
                    onClick={() => setCopyTargetId(folder.id)}
                    disabled={copyingFolder}
                  >
                    <span className="gallery-folder-sidebar-icon" aria-hidden>
                      📁
                    </span>
                    <span className="gallery-folder-sidebar-label">
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>

              {copyFolderError ? (
                <p className="gallery-folder-modal-error" role="alert">
                  {copyFolderError}
                </p>
              ) : null}

              <div className="gallery-folder-modal-actions">
                <button
                  type="button"
                  className="gallery-folder-modal-btn-secondary"
                  onClick={closeCopyFolderModal}
                  disabled={copyingFolder}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gallery-folder-modal-btn-primary"
                  disabled={copyingFolder}
                >
                  {copyingFolder ? "Copying…" : "Copy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
