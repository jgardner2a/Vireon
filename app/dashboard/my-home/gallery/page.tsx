"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  invalidateSignedUrlCache,
  invalidateSignedUrlCacheForUser,
  resolveSignedGalleryUrls,
} from "@/lib/gallerySignedUrlCache";
import {
  getCachedStorageList,
  invalidateStorageCache,
} from "@/lib/storageCache";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "uploads";
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
  name: string;
  url: string;
};

function safeFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "image";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
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

/** Reuse GalleryFile instances when path + signedUrl are unchanged. */
function memoizeGalleryFiles(
  cache: Map<string, GalleryFile>,
  batchPaths: string[],
  signed: GalleryFile[]
): GalleryFile[] {
  const signedByName = new Map(signed.map((file) => [file.name, file]));
  const memoized: GalleryFile[] = [];

  for (const path of batchPaths) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const row = signedByName.get(name);
    if (!row) {
      continue;
    }

    const existing = cache.get(path);
    if (existing && existing.url === row.url) {
      memoized.push(existing);
      continue;
    }

    const next: GalleryFile = { name: row.name, url: row.url };
    cache.set(path, next);
    memoized.push(next);
  }

  return memoized;
}

function GalleryGridImage({
  file,
  globalIndex,
  staggerWindow,
}: {
  file: GalleryFile;
  globalIndex: number;
  staggerWindow: StaggerWindow;
}) {
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

  if (inStaggerBatch) {
    return (
      <img
        key={`${staggerWindow.epoch}-${file.name}`}
        ref={imgRef}
        src={file.url}
        alt=""
        className="gallery-grid-img gallery-grid-img--stagger"
        style={imgStyle}
        loading="lazy"
      />
    );
  }

  return (
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
}

export default function GalleryPage() {
  const { state } = useDashboardState();
  const [allPaths, setAllPaths] = useState<string[]>([]);
  const [cachedFiles, setCachedFiles] = useState<GalleryFile[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staggerWindow, setStaggerWindow] = useState<StaggerWindow>({
    start: 0,
    epoch: 0,
  });
  const scopeRef = useRef<{ userId: string; homeId: string } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const lastPrefetchedStartRef = useRef(-1);
  const fileObjectByPathRef = useRef<Map<string, GalleryFile>>(new Map());
  const loadingRef = useRef(loading);

  loadingRef.current = loading;

  const visibleSlice = useMemo(
    () => buildVisibleGallerySlice(cachedFiles, loadedCount),
    [cachedFiles, loadedCount]
  );

  const fileIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    cachedFiles.forEach((f, index) => map.set(f.name, index));
    return map;
  }, [cachedFiles]);

  const signBatch = useCallback(
    async (userId: string, homeId: string, paths: string[]) => {
      return resolveSignedGalleryUrls(userId, homeId, paths, BUCKET);
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
        signed
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
    setAllPaths([]);
    setCachedFiles([]);
    setLoadedCount(0);
    setStaggerWindow({ start: 0, epoch: 0 });
    setError(null);
  }, []);

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
      const { data: listed, error: listError } = await getCachedStorageList(
        userId,
        homeId,
        "gallery",
        () =>
          supabase.storage
            .from(BUCKET)
            .list(`${userId}/${homeId}`, { limit: LIST_LIMIT })
      );

      if (listError) {
        setAllPaths([]);
        setError(listError.message);
        return;
      }

      const paths = buildPathsFromList(listed, userId, homeId);
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
  }, [state, resetGallery, loadMorePaths, prefetchNextBatch]);

  useEffect(() => {
    if (!state?.userId) {
      return;
    }

    void loadInitial();
  }, [state, loadInitial]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    for (const file of fileList) {
      const fileName = safeFileName(file.name);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${userId}/${homeId}/${fileName}`, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }
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

      <section className="dashboard-card" aria-label="Gallery upload">
        <input
          id="gallery-upload-input"
          type="file"
          accept="image/*"
          multiple
          className="gallery-file-input"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <label
          htmlFor={uploading ? undefined : "gallery-upload-input"}
          className="dashboard-btn-primary"
          style={
            uploading
              ? { opacity: 0.6, pointerEvents: "none", cursor: "not-allowed" }
              : { cursor: "pointer", display: "inline-block" }
          }
        >
          {uploading ? "Uploading…" : "Upload"}
        </label>
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
          {visibleSlice.head.map((file) => (
            <li key={`head-${file.name}`} className="gallery-grid-item">
              <GalleryGridImage
                file={file}
                globalIndex={fileIndexByName.get(file.name) ?? 0}
                staggerWindow={staggerWindow}
              />
            </li>
          ))}
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
          {visibleSlice.tail.map((file) => (
            <li key={`tail-${file.name}`} className="gallery-grid-item">
              <GalleryGridImage
                file={file}
                globalIndex={fileIndexByName.get(file.name) ?? 0}
                staggerWindow={staggerWindow}
              />
            </li>
          ))}
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
  );
}
