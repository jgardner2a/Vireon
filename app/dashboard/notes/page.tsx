"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertEvidenceLogImageFilesOnly } from "@/lib/attachments/evidenceLogImageFiles";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { PlanUsageHints } from "@/app/dashboard/_components/PlanUsageHints";
import { useDetailAttachments } from "@/lib/dashboard/useDetailAttachments";
import {
  formatNoteDate,
  noteDisplayTitle,
  previewNoteContent,
} from "@/lib/notes/format";
import {
  ALLOWED_CATEGORIES,
  DEFAULT_NOTE_CATEGORY,
  normalizeCategory,
  type NoteCategory,
} from "@/lib/notes/noteConfig";
import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import {
  fetchNoteAttachments,
  uploadNoteAttachments,
} from "@/lib/notes/notesAttachments";
import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "@/lib/notes/notes";
import type { Note } from "@/lib/notes/types";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import "./notes.css";

type ExistingAttachment = {
  id: string;
  storage_path: string;
  previewUrl: string;
};

type NoteFormState = {
  title: string;
  category: NoteCategory;
  content: string;
};

const EMPTY_FORM: NoteFormState = {
  title: "",
  category: DEFAULT_NOTE_CATEGORY,
  content: "",
};

function noteToForm(note: Note): NoteFormState {
  return {
    title: note.title ?? "",
    category: normalizeCategory(note.category),
    content: note.content,
  };
}

export default function NotesPage() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const [notes, setNotes] = useState<Note[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>(
    []
  );
  const [existingAttachments, setExistingAttachments] = useState<
    ExistingAttachment[]
  >([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<"view" | "edit">("view");
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedItemId) ?? null,
    [notes, selectedItemId]
  );

  const activeNoteId = selectedNote?.id ?? null;
  const isSidebarEdit = sidebarMode === "edit" && activeNoteId != null;

  const { attachments: detailAttachments, loading: detailAttachmentsLoading } =
    useDetailAttachments(userId, homeId, selectedItemId, fetchNoteAttachments);

  const propertyLabel = useMemo(() => {
    if (!selectedNote) {
      return null;
    }
    const home = state?.homes.find((entry) => entry.id === selectedNote.home_id);
    return home?.name ?? state?.currentHome?.name ?? null;
  }, [selectedNote, state?.homes, state?.currentHome?.name]);

  const loadNotes = useCallback(async () => {
    if (!userId || !homeId) {
      setNotes([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setError(null);

    const result = await fetchNotes(userId, homeId);

    if (!result.ok) {
      setError(result.message);
      setNotes([]);
      setListLoading(false);
      return;
    }

    setNotes(result.notes);
    setListLoading(false);
  }, [userId, homeId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadNotes();
  }, [dashboardLoading, loadNotes]);

  useEffect(() => {
    if (selectedItemId && !notes.some((note) => note.id === selectedItemId)) {
      setSelectedItemId(null);
      setSidebarMode("view");
    }
  }, [notes, selectedItemId]);

  useEffect(() => {
    if (sidebarMode !== "edit" || !selectedNote?.id || !userId || !homeId) {
      if (sidebarMode !== "edit") {
        setExistingAttachments([]);
        setPendingAttachmentFiles([]);
        setAttachmentsLoading(false);
      }
      return;
    }

    const noteId = selectedNote.id;
    let cancelled = false;

    void (async () => {
      setAttachmentsLoading(true);

      const result = await fetchNoteAttachments(userId, homeId, noteId);

      if (cancelled) {
        return;
      }

      if (!result.ok || result.items.length === 0) {
        setExistingAttachments([]);
        setAttachmentsLoading(false);
        return;
      }

      try {
        const paths = result.items.map((item) => item.storage_path);
        const signed = await resolveSignedGalleryUrls(
          userId,
          homeId,
          paths,
          STORAGE_BUCKET
        );

        if (cancelled) {
          return;
        }

        setExistingAttachments(
          result.items.map((item, index) => ({
            id: item.id,
            storage_path: item.storage_path,
            previewUrl: signed[index]?.url ?? "",
          }))
        );
      } catch {
        if (!cancelled) {
          setExistingAttachments([]);
        }
      }

      if (!cancelled) {
        setAttachmentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sidebarMode, selectedNote?.id, userId, homeId]);

  const resetAttachmentState = () => {
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setAttachmentsLoading(false);
  };

  const handleAttachmentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!picked.length) {
      return;
    }

    const imageCheck = assertEvidenceLogImageFilesOnly(picked);
    if (!imageCheck.ok) {
      setError(imageCheck.message);
      return;
    }

    setPendingAttachmentFiles((prev) => [...prev, ...imageCheck.files]);
  };

  const uploadPendingAttachments = async (
    noteId: string
  ): Promise<string | null> => {
    if (!userId || !homeId || pendingAttachmentFiles.length === 0) {
      return null;
    }

    const result = await uploadNoteAttachments({
      userId,
      homeId,
      noteId,
      files: pendingAttachmentFiles,
    });

    if (!result.ok) {
      return result.message;
    }

    setPendingAttachmentFiles([]);
    return null;
  };

  const openCreateModal = () => {
    setError(null);
    setSidebarMode("view");
    setConfirmDeleteOpen(false);
    resetAttachmentState();
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openSidebarEdit = (note: Note) => {
    setError(null);
    setSelectedItemId(note.id);
    setConfirmDeleteOpen(false);
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setForm(noteToForm(note));
    setSidebarMode("edit");
  };

  const closeSidebarEdit = () => {
    if (saving || deleting) {
      return;
    }

    setSidebarMode("view");
    setConfirmDeleteOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
  };

  const closeCreateModal = () => {
    if (saving || deleting) {
      return;
    }

    setModalOpen(false);
    setConfirmDeleteOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
  };

  const selectNote = (noteId: string) => {
    setSelectedItemId(noteId);
    if (sidebarMode === "edit") {
      setSidebarMode("view");
      setForm(EMPTY_FORM);
      resetAttachmentState();
      setConfirmDeleteOpen(false);
    } else {
      setSidebarMode("view");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !homeId) {
      setError("Select an active home before saving a note.");
      return;
    }

    setSaving(true);
    setError(null);

    if (sidebarMode === "edit" && selectedNote) {
      const result = await updateNote({
        id: selectedNote.id,
        userId,
        title: form.title,
        category: form.category,
        content: form.content,
      });

      if (!result.ok) {
        setSaving(false);
        setError(result.message);
        return;
      }

      const attachmentError = await uploadPendingAttachments(selectedNote.id);
      if (attachmentError) {
        setSaving(false);
        setError(
          `Note saved, but photos could not be uploaded: ${attachmentError}`
        );
        return;
      }

      setSaving(false);
      setConfirmDeleteOpen(false);
      setForm(EMPTY_FORM);
      resetAttachmentState();
      setSidebarMode("view");
      await loadNotes();
      return;
    }

    const result = await createNote({
      userId,
      homeId,
      title: form.title,
      category: form.category,
      content: form.content,
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }

    const attachmentError = await uploadPendingAttachments(result.note.id);
    if (attachmentError) {
      setSaving(false);
      setError(`Note saved, but photos could not be uploaded: ${attachmentError}`);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    setSelectedItemId(result.note.id);
    await loadNotes();
  };

  const openDeleteConfirm = () => {
    setConfirmDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !selectedNote) {
      return;
    }

    const noteId = selectedNote.id;

    setDeleting(true);
    setError(null);

    const result = await deleteNote(noteId, userId);

    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }

    setDeleting(false);
    setConfirmDeleteOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    setSidebarMode("view");
    if (selectedItemId === noteId) {
      setSelectedItemId(null);
    }
    await loadNotes();
  };

  if (dashboardLoading) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Notes</h1>
        <p className="dashboard-subtitle">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Notes</h1>
        <p className="dashboard-subtitle">
          Sign in to save notes for your rental.
        </p>
      </div>
    );
  }

  if (!homeId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Notes</h1>
        <p className="dashboard-subtitle">
          Set up your current home on the dashboard before adding notes.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container dashboard-container--split notes-page">
      <header className="notes-header">
        <div className="notes-header-text">
          <h1 className="dashboard-title">Notes</h1>
          <p className="dashboard-subtitle">
            Keep context for maintenance, landlord communication, and inspections
            in one place.
          </p>
        </div>
        <div className="notes-header-actions">
          <button
            type="button"
            className="dashboard-btn-primary"
            onClick={openCreateModal}
          >
            Add Note
          </button>
        </div>
      </header>

      <PlanUsageHints variant="logs-only" refreshToken={notes.length} />

      {error && !modalOpen ? (
        <p className="notes-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dashboard-split">
        <div className="dashboard-split__list">
          {listLoading ? (
            <p className="dashboard-subtitle">Loading notes…</p>
          ) : notes.length === 0 ? (
            <div className="notes-empty" aria-label="No notes yet">
              <p className="dashboard-subtitle" style={{ margin: 0 }}>
                No notes yet. Add your first note to get started.
              </p>
            </div>
          ) : (
            <ul className="notes-list" aria-label="Notes">
              {notes.map((note) => {
                const categoryLabel = note.category?.trim();
                const isSelected = note.id === selectedItemId;

                return (
                  <li
                    key={note.id}
                    className={
                      isSelected ? "notes-card notes-card--selected" : "notes-card"
                    }
                  >
                    <button
                      type="button"
                      className="notes-card-hit"
                      onClick={() => selectNote(note.id)}
                    >
                      <div className="notes-card-top">
                        <h2 className="notes-card-title">
                          {noteDisplayTitle(note.title, note.content)}
                        </h2>
                        <div className="notes-card-meta">
                          {categoryLabel ? (
                            <span className="notes-badge">{categoryLabel}</span>
                          ) : null}
                          <span>{formatNoteDate(note.created_at)}</span>
                        </div>
                      </div>
                      <p className="notes-card-preview">
                        {previewNoteContent(note.content)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="dashboard-split__detail" aria-label="Note details">
          {!selectedNote ? (
            <p className="dashboard-detail-panel__empty">
              Select a note to view details.
            </p>
          ) : isSidebarEdit ? (
            <div className="dashboard-detail-panel">
              <h2 className="notes-modal-title">Edit Note</h2>

              <form className="notes-form" onSubmit={handleSubmit}>
                <div className="notes-field">
                  <label htmlFor="sidebar-note-title">Title (optional)</label>
                  <input
                    id="sidebar-note-title"
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Short label for this note"
                    disabled={saving || deleting}
                  />
                </div>

                <div className="notes-field">
                  <label htmlFor="sidebar-note-category">Category</label>
                  <select
                    id="sidebar-note-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: normalizeCategory(e.target.value),
                      }))
                    }
                    disabled={saving || deleting}
                  >
                    {ALLOWED_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="notes-field">
                  <label htmlFor="sidebar-note-content">Content</label>
                  <textarea
                    id="sidebar-note-content"
                    value={form.content}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="What you want to remember about this home."
                    disabled={saving || deleting}
                    required
                  />
                </div>

                <div className="notes-field">
                  <span
                    id="sidebar-note-photos-label"
                    className="notes-field-label"
                  >
                    Photos (optional)
                  </span>
                  <input
                    ref={attachmentInputRef}
                    id="sidebar-note-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    className="notes-file-input"
                    disabled={saving || deleting}
                    onChange={handleAttachmentFileChange}
                    aria-labelledby="sidebar-note-photos-label"
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    className="notes-btn-secondary notes-attachment-upload-btn"
                    disabled={saving || deleting}
                    aria-labelledby="sidebar-note-photos-label"
                    aria-describedby="sidebar-note-attachments-hint"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    Upload Images
                  </button>
                  <p
                    id="sidebar-note-attachments-hint"
                    className="notes-attachments-hint"
                  >
                    Add images linked to this note as attachments.
                  </p>
                  {attachmentsLoading ? (
                    <p className="notes-attachments-hint">
                      Loading existing photos…
                    </p>
                  ) : null}
                  {existingAttachments.length > 0 ? (
                    <ul
                      className="notes-attachment-list"
                      aria-label="Existing photos"
                    >
                      {existingAttachments.map((attachment) =>
                        attachment.previewUrl ? (
                          <li key={attachment.id}>
                            <img
                              src={attachment.previewUrl}
                              alt=""
                              className="notes-attachment-thumb"
                            />
                          </li>
                        ) : null
                      )}
                    </ul>
                  ) : null}
                  {pendingAttachmentFiles.length > 0 ? (
                    <ul
                      className="notes-attachment-pending"
                      aria-label="Photos to upload"
                    >
                      {pendingAttachmentFiles.map((file) => (
                        <li key={`${file.name}-${file.lastModified}`}>
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {error ? (
                  <p className="notes-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="notes-modal-delete-row">
                  <button
                    type="button"
                    className="notes-btn-danger-ghost"
                    onClick={openDeleteConfirm}
                    disabled={saving || deleting}
                  >
                    Delete
                  </button>
                </div>

                <div className="notes-modal-actions">
                  <button
                    type="button"
                    className="notes-btn-secondary"
                    onClick={closeSidebarEdit}
                    disabled={saving || deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dashboard-btn-primary"
                    style={{ marginTop: 0 }}
                    disabled={saving || deleting}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="dashboard-detail-panel">
              <header className="dashboard-detail-panel__header">
                <h2 className="dashboard-detail-panel__title">
                  {noteDisplayTitle(selectedNote.title, selectedNote.content)}
                </h2>
                <div className="dashboard-detail-panel__actions">
                  <button
                    type="button"
                    className="notes-btn-secondary"
                    onClick={() => openSidebarEdit(selectedNote)}
                  >
                    Edit
                  </button>
                </div>
              </header>

              <div className="dashboard-detail-panel__meta">
                {selectedNote.category?.trim() ? (
                  <div className="dashboard-detail-panel__meta-item">
                    <span className="dashboard-detail-panel__meta-label">
                      Category
                    </span>
                    <span className="notes-badge">
                      {selectedNote.category.trim()}
                    </span>
                  </div>
                ) : null}
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Created
                  </span>
                  <span>{formatNoteDate(selectedNote.created_at)}</span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Last updated
                  </span>
                  <span>{formatNoteDate(selectedNote.updated_at)}</span>
                </div>
                {propertyLabel ? (
                  <div className="dashboard-detail-panel__meta-item">
                    <span className="dashboard-detail-panel__meta-label">
                      Property
                    </span>
                    <span>{propertyLabel}</span>
                  </div>
                ) : null}
              </div>

              <section className="dashboard-detail-panel__section">
                <h3 className="dashboard-detail-panel__section-title">Content</h3>
                <p className="dashboard-detail-panel__body-text">
                  {selectedNote.content}
                </p>
              </section>

              <section className="dashboard-detail-panel__section">
                <h3 className="dashboard-detail-panel__section-title">
                  Attachments
                </h3>
                {detailAttachmentsLoading ? (
                  <p className="notes-attachments-hint">Loading photos…</p>
                ) : null}
                {!detailAttachmentsLoading && detailAttachments.length === 0 ? (
                  <p className="notes-attachments-hint">No photos attached.</p>
                ) : null}
                {detailAttachments.length > 0 ? (
                  <ul
                    className="notes-attachment-list"
                    aria-label="Attached photos"
                  >
                    {detailAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="notes-attachment-thumb"
                          />
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
              </section>
            </div>
          )}
        </aside>
      </div>

      {modalOpen ? (
        <div
          className="notes-modal-backdrop"
          role="presentation"
          onClick={closeCreateModal}
        >
          <div
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="note-modal-title" className="notes-modal-title">
              Add Note
            </h2>

            <form className="notes-form" onSubmit={handleSubmit}>
              <div className="notes-field">
                <label htmlFor="note-title">Title (optional)</label>
                <input
                  id="note-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Short label for this note"
                  disabled={saving || deleting}
                />
              </div>

              <div className="notes-field">
                <label htmlFor="note-category">Category</label>
                <select
                  id="note-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: normalizeCategory(e.target.value),
                    }))
                  }
                  disabled={saving || deleting}
                >
                  {ALLOWED_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="notes-field">
                <label htmlFor="note-content">Content</label>
                <textarea
                  id="note-content"
                  value={form.content}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="What you want to remember about this home."
                  disabled={saving || deleting}
                  required
                />
              </div>

              <div className="notes-field">
                <span id="note-photos-label" className="notes-field-label">
                  Photos (optional)
                </span>
                <input
                  ref={attachmentInputRef}
                  id="note-attachments"
                  type="file"
                  accept="image/*"
                  multiple
                  className="notes-file-input"
                  disabled={saving || deleting}
                  onChange={handleAttachmentFileChange}
                  aria-labelledby="note-photos-label"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  className="notes-btn-secondary notes-attachment-upload-btn"
                  disabled={saving || deleting}
                  aria-labelledby="note-photos-label"
                  aria-describedby="note-attachments-hint"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  Upload Images
                </button>
                <p id="note-attachments-hint" className="notes-attachments-hint">
                  Add images linked to this note as attachments.
                </p>
                {attachmentsLoading ? (
                  <p className="notes-attachments-hint">
                    Loading existing photos…
                  </p>
                ) : null}
                {existingAttachments.length > 0 ? (
                  <ul
                    className="notes-attachment-list"
                    aria-label="Existing photos"
                  >
                    {existingAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="notes-attachment-thumb"
                          />
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
                {pendingAttachmentFiles.length > 0 ? (
                  <ul
                    className="notes-attachment-pending"
                    aria-label="Photos to upload"
                  >
                    {pendingAttachmentFiles.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {error ? (
                <p className="notes-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="notes-modal-actions">
                <button
                  type="button"
                  className="notes-btn-secondary"
                  onClick={closeCreateModal}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dashboard-btn-primary"
                  style={{ marginTop: 0 }}
                  disabled={saving || deleting}
                >
                  {saving ? "Saving…" : "Save note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDeleteOpen ? (
        <div
          className="notes-confirm-backdrop"
          role="presentation"
          onClick={closeDeleteConfirm}
        >
          <div
            className="notes-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
            aria-describedby="delete-note-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-note-title" className="notes-confirm-title">
              Delete Note?
            </h2>
            <p id="delete-note-desc" className="notes-confirm-message">
              This action will permanently remove this note.
            </p>
            {error && confirmDeleteOpen ? (
              <p className="notes-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="notes-confirm-actions">
              <button
                type="button"
                className="dashboard-btn-primary notes-confirm-cancel"
                style={{ marginTop: 0 }}
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notes-btn-danger"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
