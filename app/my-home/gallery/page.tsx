"use client";

import { useEffect, useState } from "react";
import {
  emptyState,
  galleryGrid,
  galleryImage,
  h1,
  page,
  pageHeader,
  pageHeaderStack,
  subtitle,
} from "../ui";

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("gallery") || "[]");
    setImages(data);
  }, []);

  return (
    <div style={page}>
      <header style={pageHeader}>
        <div style={pageHeaderStack}>
          <h1 style={h1}>Gallery</h1>
          <p style={subtitle}>Uploaded evidence images</p>
        </div>
      </header>

      <div className="my-home-upload-zone">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);

            const readers = files.map((file) => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
              });
            });

            Promise.all(readers).then((results) => {
              const existing = JSON.parse(
                localStorage.getItem("gallery") || "[]"
              );

              const updated = [...existing, ...results];

              localStorage.setItem("gallery", JSON.stringify(updated));
              setImages(updated);
            });
          }}
        />
      </div>

      <div style={galleryGrid}>
        {images.length === 0 ? (
          <div style={{ ...emptyState, gridColumn: "1 / -1" }}>
            No images uploaded yet.
          </div>
        ) : (
          images.map((img, i) => (
            <img key={i} src={img} alt="" style={galleryImage} />
          ))
        )}
      </div>
    </div>
  );
}
