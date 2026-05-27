"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  getValidCachedSignedUrl,
  invalidateSignedUrlCache,
  invalidateSignedUrlCacheForUser,
  resolveSignedGalleryUrls,
} from "@/lib/gallerySignedUrlCache";
import { buildGalleryDisplayEntriesFromPaths } from "@/lib/gallery/buildGalleryDisplay";
import { buildPathsFromGalleryItems } from "@/lib/gallery/buildGalleryPaths";
import { deleteGalleryItem } from "@/lib/gallery/deleteGalleryItem";
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
import { uploadFilesToGallery } from "@/lib/gallery/uploadStorageFiles";
import {
  getCachedStorageList,
  invalidateStorageCache,
} from "@/lib/storageCache";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = STORAGE_BUCKET;
const PAGE_SIZE = 20;
/** Max thumbnails mounted in the DOM (head + tail windows). */
const MAX_VISIBLE = 60;
/** Extra items before the current batch in the tail window. */
const VISIBLE_BUFFER = 20;
/** Approximate row height for mid-list scroll spacer (img + gap). */
const GALLERY_ROW_HEIGHT_PX = 152;
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
};

type SignedGalleryFile = {
  path: string;
  name: string;
  url: string;
};

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

/** Reuse GalleryFile instances when storage_path + signedUrl are unchanged. */
function memoizeGalleryFiles(
  cache: Map<string, GalleryFile>,
  batchPaths: string[],
  signed: SignedGalleryFile[],
  galleryIdByPath: Map<string, string | null>
): GalleryFile[] {
  const signedByPath = new Map(signed.map((file) => [file.path, file]));
  const memoized: GalleryFile[] = [];

  for (const path of batchPaths) {
    const row = signedByPath.get(path);
    if (!row) {
      continue;
    }

    const existing = cache.get(path);
    if (existing && existing.url === row.url) {
      memoized.push(existing);
      continue;
    }

    const next: GalleryFile = {
      path,
      name: row.name,
      url: row.url,
      galleryId: galleryIdByPath.get(path) ?? null,
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

  const imgStyle = {
    width: 100,
    height: 100,
    objectFit: "cover" as const,
    borderRadius: 8,
    ...(inStaggerBatch ? { animationDelay: `${staggerDelayMs}ms` } : {}),
  };

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
      style={imgStyle}
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
  activeFolderId,
  canMove,
  onOpenMoveFolder,
  onOpenCreateFolder,
  onSelectAll,
  onSelectFolder,
}: {
  folders: Folder[];
  loading: boolean;
  activeFolderId: string | null;
  canMove: boolean;
  onOpenMoveFolder: () => void;
  onOpenCreateFolder: () => void;
  onSelectAll: () => void;
  onSelectFolder: (folderId: string) => void;
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
        <button
          type="button"
          className="gallery-folder-sidebar-move-btn"
          onClick={onOpenMoveFolder}
          disabled={!canMove}
        >
          Move Selected to Folder
        </button>
      ) : null}
      <button
        type="button"
        className={
          activeFolderId === null
            ? "gallery-folder-sidebar-all gallery-folder-sidebar-all--active"
            : "gallery-folder-sidebar-all"
        }
        onClick={onSelectAll}
      >
        All Images
      </button>
      {loading ? (
        <p className="gallery-folder-sidebar-loading">Loading…</p>
      ) : folders.length === 0 ? (
        <p className="gallery-folder-sidebar-empty">No folders yet</p>
      ) : (
        <ul className="gallery-folder-sidebar-list" aria-label="Folder list">
          {folders.map((folder) => {
            const isActive = activeFolderId === folder.id;
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
    </aside>
  );
}

export default function GalleryPage() {
  const { state } = useDashboardState();
  const [allPaths, setAllPaths] = useState<string[]>([]);
  const [cachedFiles, setCachedFiles] = useState<GalleryFile[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [galleryIdByPath, setGalleryIdByPath] = useState(
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
  const scopeRef = useRef<{ userId: string; homeId: string } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const lastPrefetchedStartRef = useRef(-1);
  const fileObjectByPathRef = useRef<Map<string, GalleryFile>>(new Map());
  const galleryIdByPathRef = useRef<Map<string, string | null>>(new Map());
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
      append: boolean
    ): Promise<number> => {
      const batch = paths.slice(start, start + PAGE_SIZE);
      if (batch.length === 0) {
        return start;
      }

      const signed = await signBatch(userId, homeId, batch);
      const memoized = memoizeGalleryFiles(
        fileObjectByPathRef.current,
        batch,
        signed,
        galleryIdByPathRef.current
      );
      const end = start + batch.length;

      await scheduleGalleryDomUpdate(() => {
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
    setGalleryIdByPath(new Map());
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
    setCachedFiles([]);
    setLoadedCount(0);
    setStaggerWindow({ start: 0, epoch: 0 });
    lastPrefetchedStartRef.current = -1;

    try {
      if (activeFolderId) {
        const galleryMetaResult = await fetchGalleryItemsForHome(
          userId,
          homeId,
          { folderId: activeFolderId }
        );

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
        const idMap = new Map(
          displayEntries.map((entry) => [entry.path, entry.galleryId])
        );
        galleryIdByPathRef.current = idMap;
        setGalleryIdByPath(idMap);
        setAllPaths(paths);

        if (paths.length === 0) {
          return;
        }

        const end = await loadMorePaths(userId, homeId, paths, 0, false);
        void prefetchNextBatch(userId, homeId, paths, end);
        return;
      }

      const [{ data: listed, error: listError }, galleryMetaResult] =
        await Promise.all([
          getCachedStorageList(userId, homeId, "gallery", () =>
            supabase.storage
              .from(BUCKET)
              .list(`${userId}/${homeId}`, { limit: LIST_LIMIT })
          ),
          fetchGalleryItemsForHome(userId, homeId),
        ]);

      if (listError) {
        setAllPaths([]);
        setError(listError.message);
        return;
      }

      const paths = buildPathsFromList(listed, userId, homeId);
      const galleryItems = galleryMetaResult.ok ? galleryMetaResult.items : [];
      const displayEntries = buildGalleryDisplayEntriesFromPaths(
        paths,
        galleryItems
      );
      const idMap = new Map(
        displayEntries.map((entry) => [entry.path, entry.galleryId])
      );
      galleryIdByPathRef.current = idMap;
      setGalleryIdByPath(idMap);
      setAllPaths(paths);

      if (paths.length === 0) {
        return;
      }

      const end = await loadMorePaths(userId, homeId, paths, 0, false);
      void prefetchNextBatch(userId, homeId, paths, end);
    } catch (err) {
      setAllPaths([]);
      setError(
        err instanceof Error ? err.message : "Could not load gallery images."
      );
    } finally {
      setLoading(false);
    }
  }, [state, resetGallery, loadMorePaths, prefetchNextBatch, activeFolderId]);

  const refetchGallery = loadInitial;

  const handleBulkDelete = useCallback(async () => {
    const userId = state?.userId;
    const homeId = state?.currentHomeId;

    if (!userId || !homeId) {
      setError("Not signed in.");
      return;
    }

    if (selectedItems.length === 0 || bulkDeleting) {
      return;
    }

    const itemsToDelete = selectedItems;
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
          fileObjectByPathRef.current.delete(path);
        }
      }
      setGalleryIdByPath(new Map(galleryIdByPathRef.current));
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
    selectedItems,
    bulkDeleting,
    clearSelection,
    refetchGallery,
  ]);

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
    setActiveFolderId(null);
  }, [state?.currentHomeId]);

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

    const targetFolderId = moveTargetId ?? null;

    const ids = selectedItems.map((item) => item.id).filter(Boolean);
    if (ids.length === 0) {
      setMoveFolderError("Selected images are no longer available.");
      return;
    }

    setMovingFolder(true);
    setMoveFolderError(null);

    const { error } = await supabase
      .from("gallery")
      .update({ folder_id: targetFolderId })
      .in("id", ids)
      .eq("user_id", userId)
      .eq("home_id", homeId);

    if (error) {
      console.error("[gallery] move to folder", error);
      setMovingFolder(false);
      setMoveFolderError(error.message || "Could not move images.");
      return;
    }

    setMovingFolder(false);
    setIsMoveFolderOpen(false);
    setMoveFolderError(null);
    setMoveTargetId(null);
    clearSelection();
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
      const end = await loadMorePaths(userId, homeId, allPaths, loadedCount, true);
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
    const fileList = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!fileList.length) return;

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

    const uploadResult = await uploadFilesToGallery({
      userId,
      homeId,
      files: fileList,
      logContext: "gallery",
      context: "gallery",
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
  };

  return (
    <div className="dashboard-container gallery-page">
      <h1 className="dashboard-title">Gallery</h1>

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
              disabled={uploading}
            />
            <div className="gallery-toolbar-row">
              <div className="gallery-toolbar-upload">
                <label
                  htmlFor={uploading ? undefined : "gallery-upload-input"}
                  className="dashboard-btn-primary gallery-toolbar-upload-btn"
                  style={
                    uploading
                      ? {
                          opacity: 0.6,
                          pointerEvents: "none",
                          cursor: "not-allowed",
                        }
                      : { cursor: "pointer", display: "inline-block" }
                  }
                >
                  {uploading ? "Uploading…" : "Upload"}
                </label>
              </div>
              {selectedItems.length > 0 ? (
                <GalleryInlineSelectionActions
                  count={selectedItems.length}
                  onClear={clearSelection}
                  onDeleteSelected={() => void handleBulkDelete()}
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
          activeFolderId={activeFolderId}
          canMove={selectedItems.length > 0}
          onOpenMoveFolder={openMoveFolderModal}
          onOpenCreateFolder={openCreateFolderModal}
          onSelectAll={() => setActiveFolderId(null)}
          onSelectFolder={(folderId) => setActiveFolderId(folderId)}
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
    </div>
  );
}
