"use client";

import type { GalleryMedia } from "@/lib/gallery";
import { galleryMediaDisplaySrc } from "./galleryMediaDisplaySrc";

type GalleryMediaGridProps = {
  items: GalleryMedia[];
  selectedMediaId: string | null;
  propertyId: string;
  selectedFolderId: string;
  selectedFolderName?: string;
  onSelectMedia: (mediaId: string) => void;
};

export function GalleryMediaGrid({
  items,
  selectedMediaId,
  propertyId,
  selectedFolderId,
  selectedFolderName,
  onSelectMedia,
}: GalleryMediaGridProps) {
  if (!propertyId) {
    return (
      <div className="my-home-gallery-panel my-home-gallery-panel--grid">
        <p className="my-home-empty my-home-gallery-panel-empty">
          Select a property to view media.
        </p>
      </div>
    );
  }

  if (!selectedFolderId) {
    return (
      <div className="my-home-gallery-panel my-home-gallery-panel--grid">
        <p className="my-home-empty my-home-gallery-panel-empty">
          Select a folder to view media.
        </p>
        </div>
    );
  }

  return (
    <section
      className="my-home-gallery-panel my-home-gallery-panel--grid"
      aria-label={
        selectedFolderName
          ? `Media in ${selectedFolderName}`
          : "Media in folder"
      }
      aria-live="polite"
    >
      {items.length === 0 ? (
        <p className="my-home-empty my-home-gallery-panel-empty">
          No media in this folder.
        </p>
      ) : (
        <ul className="my-home-gallery-thumb-grid" role="list">
          {items.map((item) => {
            const isActive = item.id === selectedMediaId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`my-home-gallery-thumb${
                    isActive ? " my-home-gallery-thumb--active" : ""
                  }`}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={item.name}
                  onClick={() => onSelectMedia(item.id)}
                >
                  {item.type === "video" ? (
                    <video
                      className="my-home-gallery-thumb__media"
                      src={item.dataUrl}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="my-home-gallery-thumb__media"
                      src={galleryMediaDisplaySrc(item)}
                      alt=""
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
