"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveHomeId } from "@/lib/home/getActiveHomeId";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "uploads";

type GalleryFile = {
  name: string;
  url: string;
};

function safeFileName(original: string): string {
  const base = original.replace(/[/\\]/g, "").trim() || "image";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${sanitized}`;
}

export default function GalleryPage() {
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setFiles([]);
      setError(authError?.message ?? "Not signed in.");
      setLoading(false);
      return;
    }

    const userId = user.id;
    const homeId = await getActiveHomeId(userId);

    if (!homeId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    const { data: listed, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(`${userId}/${homeId}`, { limit: 100 });

    if (listError) {
      setFiles([]);
      setError(listError.message);
      setLoading(false);
      return;
    }

    const next: GalleryFile[] = [];

    const paths = (listed ?? [])
      .filter((item) => item.name && item.id !== null)
      .map((item) => `${userId}/${homeId}/${item.name}`);

    if (paths.length > 0) {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60);

      if (signError) {
        setFiles([]);
        setLoading(false);
        return;
      }

      for (const row of signed ?? []) {
        if (row.error || !row.signedUrl || !row.path) continue;

        const name = row.path.slice(row.path.lastIndexOf("/") + 1);
        next.push({ name, url: row.signedUrl });
      }
    }

    next.reverse();
    setFiles(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!fileList.length) return;

    setUploading(true);
    setError(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError(authError?.message ?? "Not signed in.");
      setUploading(false);
      return;
    }

    const userId = user.id;
    const homeId = await getActiveHomeId(userId);

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

    setUploading(false);
    await loadFiles();
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

      {!loading && files.length > 0 ? (
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
    </div>
  );
}
