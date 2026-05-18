"use client";

import { useEffect, useState } from "react";

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("gallery") || "[]");
    setImages(data);
  }, []);

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Gallery</h1>
      </div>

      {/* UPLOAD INPUT */}
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

      {/* GRID */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {images.length === 0 ? (
          <p style={{ color: "#888" }}>No images uploaded yet.</p>
        ) : (
          images.map((img, i) => (
            <img
              key={i}
              src={img}
              style={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid #eee",
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}