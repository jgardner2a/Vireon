"use client";

import { useCallback, useEffect, useState } from "react";

export const GALLERY_SELECTION_STORAGE_KEY = "vireon_gallery_selection";

export type GallerySelectionItem = {
  id: string;
  filePath: string;
};

type GallerySelectionStorage = {
  userId: string;
  homeId: string;
  items: GallerySelectionItem[];
};

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // quota / private mode
  }
}

function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Removes persisted gallery selection (e.g. on logout). */
export function clearGallerySelectionStorage(): void {
  removeSessionStorage(GALLERY_SELECTION_STORAGE_KEY);
}

function normalizeItems(items: GallerySelectionItem[]): GallerySelectionItem[] {
  const seen = new Set<string>();
  const normalized: GallerySelectionItem[] = [];

  for (const raw of items) {
    const id = raw.id.trim();
    const filePath = raw.filePath.trim();
    if (!id || !filePath || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push({ id, filePath });
  }

  return normalized;
}

function readStoredSelection(): GallerySelectionStorage | null {
  const raw = readSessionStorage(GALLERY_SELECTION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GallerySelectionStorage;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.homeId !== "string" ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }

    const items = parsed.items
      .filter(
        (entry): entry is GallerySelectionItem =>
          entry != null &&
          typeof entry === "object" &&
          typeof (entry as GallerySelectionItem).id === "string" &&
          typeof (entry as GallerySelectionItem).filePath === "string"
      )
      .map((entry) => ({
        id: String(entry.id),
        filePath: String(entry.filePath),
      }));

    return {
      userId: parsed.userId,
      homeId: parsed.homeId,
      items: normalizeItems(items),
    };
  } catch {
    removeSessionStorage(GALLERY_SELECTION_STORAGE_KEY);
    return null;
  }
}

function readItemsForScope(
  userId: string | null,
  homeId: string | null
): GallerySelectionItem[] {
  if (!userId || !homeId) {
    return [];
  }

  const stored = readStoredSelection();
  if (stored?.userId === userId && stored?.homeId === homeId) {
    return stored.items;
  }

  return [];
}

function persistSelection(
  userId: string | null,
  homeId: string | null,
  items: GallerySelectionItem[]
): void {
  if (!userId || !homeId) {
    clearGallerySelectionStorage();
    return;
  }

  const normalized = normalizeItems(items);
  const payload: GallerySelectionStorage = {
    userId,
    homeId,
    items: normalized,
  };

  writeSessionStorage(
    GALLERY_SELECTION_STORAGE_KEY,
    JSON.stringify(payload)
  );
}

function itemsEqual(
  a: GallerySelectionItem[],
  b: GallerySelectionItem[]
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every(
    (item, index) => item.id === b[index]?.id && item.filePath === b[index]?.filePath
  );
}

/**
 * Session-persisted gallery selection (survives reload, pagination, and filters).
 * Each entry is self-contained (id + filePath) for deterministic bulk delete.
 */
export function useGallerySelection(
  scopeUserId: string | null,
  scopeHomeId: string | null
) {
  const [selectedItems, setSelectedItemsState] = useState<GallerySelectionItem[]>(
    () => readItemsForScope(scopeUserId, scopeHomeId)
  );

  const applySelection = useCallback(
    (items: GallerySelectionItem[]) => {
      const normalized = normalizeItems(items);
      setSelectedItemsState((prev) => {
        if (itemsEqual(prev, normalized)) {
          return prev;
        }
        persistSelection(scopeUserId, scopeHomeId, normalized);
        return normalized;
      });
    },
    [scopeUserId, scopeHomeId]
  );

  useEffect(() => {
    applySelection(readItemsForScope(scopeUserId, scopeHomeId));
  }, [scopeUserId, scopeHomeId, applySelection]);

  const toggleSelect = useCallback(
    (item: GallerySelectionItem) => {
      const id = item.id.trim();
      const filePath = item.filePath.trim();
      if (!id || !filePath) {
        return;
      }

      const nextItem = { id, filePath };

      setSelectedItemsState((prev) => {
        const exists = prev.some((row) => row.id === id);
        const next = exists
          ? prev.filter((row) => row.id !== id)
          : [...prev, nextItem];
        const normalized = normalizeItems(next);
        persistSelection(scopeUserId, scopeHomeId, normalized);
        return normalized;
      });
    },
    [scopeUserId, scopeHomeId]
  );

  const clearSelection = useCallback(() => {
    clearGallerySelectionStorage();
    setSelectedItemsState((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const setSelection = useCallback(
    (items: GallerySelectionItem[]) => {
      applySelection(items);
    },
    [applySelection]
  );

  /** Keeps selection ⊆ items still present in the current gallery dataset (by id). */
  const syncSelection = useCallback(
    (availableGalleryIds: Set<string>) => {
      setSelectedItemsState((prev) => {
        const next = normalizeItems(
          prev.filter((item) => availableGalleryIds.has(item.id))
        );
        if (itemsEqual(prev, next)) {
          return prev;
        }
        persistSelection(scopeUserId, scopeHomeId, next);
        return next;
      });
    },
    [scopeUserId, scopeHomeId]
  );

  return {
    selectedItems,
    toggleSelect,
    clearSelection,
    setSelection,
    syncSelection,
  };
}
