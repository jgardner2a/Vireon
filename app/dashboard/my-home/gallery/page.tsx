"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
/** List cap for large galleries; paths are batched client-side. */
const LIST_LIMIT = 1000;

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

export default function GalleryPage() {
  const { state } = useDashboardState();
  const [allPaths, setAllPaths] = useState<string[]>([]);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scopeRef = useRef<{ userId: string; homeId: string } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const lastPrefetchedStartRef = useRef(-1);
  const loadingRef = useRef(loading);

  loadingRef.current = loading;

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
      setFiles((prev) => (append ? [...prev, ...signed] : signed));
      const end = start + batch.length;
      setLoadedCount(end);
      return end;
    },
    [signBatch]
  );

  const resetGallery = useCallback(() => {
    setAllPaths([]);
    setFiles([]);
    setLoadedCount(0);
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
    setFiles([]);
    setLoadedCount(0);
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
  const showGrid = !loading && files.length > 0;

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
    <div className="dashboard-container">
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

      {!loading && files.length === 0 ? (
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
          {files.map((file) => (
            <li key={file.name} className="gallery-grid-item">
              <img
                src={file.url}
                alt=""
                className="gallery-grid-img"
                style={{
                  width: 100,
                  height: 100,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
                loading="lazy"
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

      {loadingMore ? (
        <p className="dashboard-subtitle" style={{ margin: "8px 0 0" }}>
          Loading more…
        </p>
      ) : null}
    </div>
  );
}
