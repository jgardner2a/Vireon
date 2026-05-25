"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
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
import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from "@/lib/notes/notes";
import type { Note } from "@/lib/notes/types";
import "./notes.css";

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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;
  const isEditMode = editingNoteId !== null;

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

  const openCreateModal = () => {
    setError(null);
    setEditingNoteId(null);
    setConfirmDeleteOpen(false);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setError(null);
    setEditingNoteId(note.id);
    setConfirmDeleteOpen(false);
    setForm(noteToForm(note));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) {
      return;
    }

    setModalOpen(false);
    setConfirmDeleteOpen(false);
    setEditingNoteId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !homeId) {
      setError("Select an active home before saving a note.");
      return;
    }

    setSaving(true);
    setError(null);

    if (isEditMode && editingNoteId) {
      const result = await updateNote({
        id: editingNoteId,
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

      setSaving(false);
      setModalOpen(false);
      setConfirmDeleteOpen(false);
      setEditingNoteId(null);
      setForm(EMPTY_FORM);
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

    setSaving(false);
    setModalOpen(false);
    setEditingNoteId(null);
    setForm(EMPTY_FORM);
    await loadNotes();
  };

  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!userId || !editingNoteId) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteNote(editingNoteId, userId);

    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }

    setDeleting(false);
    setConfirmDeleteOpen(false);
    setModalOpen(false);
    setEditingNoteId(null);
    setForm(EMPTY_FORM);
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
    <div className="dashboard-container notes-page">
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

      {error && !modalOpen ? (
        <p className="notes-error" role="alert">
          {error}
        </p>
      ) : null}

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

            return (
              <li key={note.id} className="notes-card">
                <button
                  type="button"
                  className="notes-card-hit"
                  onClick={() => openEditModal(note)}
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

      {modalOpen ? (
        <div
          className="notes-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="note-modal-title" className="notes-modal-title">
              {isEditMode ? "Edit Note" : "Add Note"}
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

              {error ? (
                <p className="notes-error" role="alert">
                  {error}
                </p>
              ) : null}

              {isEditMode ? (
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
              ) : null}

              <div className="notes-modal-actions">
                <button
                  type="button"
                  className="notes-btn-secondary"
                  onClick={closeModal}
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
                  {saving
                    ? "Saving…"
                    : isEditMode
                      ? "Save changes"
                      : "Save note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalOpen && confirmDeleteOpen ? (
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
