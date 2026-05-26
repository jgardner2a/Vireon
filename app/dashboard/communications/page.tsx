"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_STATUSES,
  DEFAULT_COMMUNICATION_CATEGORY,
  normalizeCommunicationCategory,
  normalizeCommunicationStatus,
  type CommunicationCategory,
  type CommunicationStatus,
} from "@/lib/communications/communicationConfig";
import { uploadCommunicationAttachments } from "@/lib/communications/communicationAttachments";
import {
  createCommunication,
  deleteCommunication,
  fetchCommunications,
  updateCommunication,
  updateCommunicationStatus,
} from "@/lib/communications/communications";
import {
  formatCommunicationDate,
  previewMessage,
} from "@/lib/communications/format";
import type { Communication } from "@/lib/communications/types";
import "./communications.css";

type CommunicationFormState = {
  title: string;
  category: CommunicationCategory;
  message: string;
  status: CommunicationStatus;
};

const EMPTY_FORM: CommunicationFormState = {
  title: "",
  category: DEFAULT_COMMUNICATION_CATEGORY,
  message: "",
  status: "Open",
};

function communicationToForm(communication: Communication): CommunicationFormState {
  return {
    title: communication.title,
    category: normalizeCommunicationCategory(communication.category),
    message: communication.message,
    status: normalizeCommunicationStatus(communication.status),
  };
}

export default function CommunicationsPage() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCommunicationId, setEditingCommunicationId] = useState<
    string | null
  >(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<CommunicationFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>(
    []
  );
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;
  const isEditMode = editingCommunicationId !== null;

  const loadCommunications = useCallback(async () => {
    if (!userId || !homeId) {
      setCommunications([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setError(null);

    const result = await fetchCommunications(userId, homeId);

    if (!result.ok) {
      setError(result.message);
      setCommunications([]);
      setListLoading(false);
      return;
    }

    setCommunications(result.communications);
    setListLoading(false);
  }, [userId, homeId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadCommunications();
  }, [dashboardLoading, loadCommunications]);

  const resetAttachmentState = () => {
    setPendingAttachmentFiles([]);
  };

  const handleAttachmentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!picked.length) {
      return;
    }

    const images = picked.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return;
    }

    setPendingAttachmentFiles((prev) => [...prev, ...images]);
  };

  const uploadPendingAttachments = async (
    communicationId: string
  ): Promise<void> => {
    if (!userId || !homeId || pendingAttachmentFiles.length === 0) {
      return;
    }

    const result = await uploadCommunicationAttachments({
      userId,
      homeId,
      communicationId,
      files: pendingAttachmentFiles,
    });

    if (!result.ok) {
      console.error(
        "[communications] attachment upload after save",
        result.message
      );
      return;
    }

    setPendingAttachmentFiles([]);
  };

  const openCreateModal = () => {
    setError(null);
    setEditingCommunicationId(null);
    setConfirmDeleteOpen(false);
    resetAttachmentState();
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (communication: Communication) => {
    setError(null);
    setEditingCommunicationId(communication.id);
    setConfirmDeleteOpen(false);
    setPendingAttachmentFiles([]);
    setForm(communicationToForm(communication));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) {
      return;
    }

    setModalOpen(false);
    setConfirmDeleteOpen(false);
    setEditingCommunicationId(null);
    setForm(EMPTY_FORM);
    resetAttachmentState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !homeId) {
      setError("Select an active home before logging a communication.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please add a title.");
      return;
    }

    if (!form.message.trim()) {
      setError("Please add a message.");
      return;
    }

    setSaving(true);
    setError(null);

    if (isEditMode && editingCommunicationId) {
      const result = await updateCommunication({
        id: editingCommunicationId,
        userId,
        title: form.title,
        category: form.category,
        message: form.message,
        status: form.status,
      });

      if (!result.ok) {
        setSaving(false);
        setError(result.message);
        return;
      }

      await uploadPendingAttachments(editingCommunicationId);

      setSaving(false);
      setModalOpen(false);
      setConfirmDeleteOpen(false);
      setEditingCommunicationId(null);
      setForm(EMPTY_FORM);
      resetAttachmentState();
      await loadCommunications();
      return;
    }

    const result = await createCommunication({
      userId,
      homeId,
      title: form.title,
      category: form.category,
      message: form.message,
      status: form.status,
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }

    await uploadPendingAttachments(result.communication.id);

    setSaving(false);
    setModalOpen(false);
    setEditingCommunicationId(null);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    await loadCommunications();
  };

  const handleStatusToggle = async (
    e: React.MouseEvent,
    communication: Communication
  ) => {
    e.stopPropagation();

    if (!userId || statusTogglingId) {
      return;
    }

    const nextStatus: CommunicationStatus =
      communication.status === "Resolved" ? "Open" : "Resolved";

    setStatusTogglingId(communication.id);
    setError(null);

    const result = await updateCommunicationStatus(
      communication.id,
      userId,
      nextStatus
    );

    if (!result.ok) {
      setStatusTogglingId(null);
      setError(result.message);
      return;
    }

    setCommunications((prev) =>
      prev.map((row) =>
        row.id === communication.id ? result.communication : row
      )
    );
    setStatusTogglingId(null);
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
    if (!userId || !editingCommunicationId) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteCommunication(editingCommunicationId, userId);

    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }

    setDeleting(false);
    setConfirmDeleteOpen(false);
    setModalOpen(false);
    setEditingCommunicationId(null);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    await loadCommunications();
  };

  if (dashboardLoading) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Apartment Communications Log</h1>
        <p className="dashboard-subtitle">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Apartment Communications Log</h1>
        <p className="dashboard-subtitle">
          Sign in to track communications for your rental.
        </p>
      </div>
    );
  }

  if (!homeId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Apartment Communications Log</h1>
        <p className="dashboard-subtitle">
          Set up your current home on the dashboard before logging communications.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container communications-page">
      <header className="communications-header">
        <div className="communications-header-text">
          <h1 className="dashboard-title">Apartment Communications Log</h1>
          <p className="dashboard-subtitle">
            Document repair requests, landlord responses, follow-ups, and lease
            discussions for your home.
          </p>
        </div>
        <div className="communications-header-actions">
          <button
            type="button"
            className="dashboard-btn-primary"
            onClick={openCreateModal}
          >
            Log Communication
          </button>
        </div>
      </header>

      {error && !modalOpen ? (
        <p className="communications-error" role="alert">
          {error}
        </p>
      ) : null}

      {listLoading ? (
        <p className="dashboard-subtitle">Loading communications…</p>
      ) : communications.length === 0 ? (
        <div
          className="communications-empty"
          aria-label="No communications yet"
        >
          <p className="dashboard-subtitle" style={{ margin: 0 }}>
            No communications logged yet. Add your first entry to start your
            record.
          </p>
        </div>
      ) : (
        <ul className="communications-list" aria-label="Apartment communications">
          {communications.map((communication) => {
            const isResolved = communication.status === "Resolved";
            const toggling = statusTogglingId === communication.id;

            return (
              <li
                key={communication.id}
                className={
                  isResolved
                    ? "communications-card communications-card--resolved"
                    : "communications-card communications-card--active"
                }
              >
                <button
                  type="button"
                  className="communications-card-hit"
                  onClick={() => openEditModal(communication)}
                >
                  <div className="communications-card-top">
                    <h2 className="communications-card-title">
                      {communication.title}
                    </h2>
                    <div className="communications-card-meta">
                      <span
                        className={
                          isResolved
                            ? "communications-badge communications-badge--resolved"
                            : "communications-badge communications-badge--active"
                        }
                      >
                        {communication.status}
                      </span>
                      <span>
                        {formatCommunicationDate(communication.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="communications-card-meta">
                    <span className="communications-card-category">
                      {communication.category}
                    </span>
                  </p>
                  <p className="communications-card-message">
                    {previewMessage(communication.message)}
                  </p>
                </button>
                <div className="communications-card-actions">
                  <button
                    type="button"
                    className="communications-btn-secondary communications-card-action"
                    disabled={toggling}
                    onClick={(e) => void handleStatusToggle(e, communication)}
                  >
                    {toggling
                      ? "Updating…"
                      : isResolved
                        ? "Reopen"
                        : "Resolve"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen ? (
        <div
          className="communications-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="communications-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-communication-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="log-communication-title" className="communications-modal-title">
              {isEditMode
                ? "Edit Apartment Communications Log"
                : "Log Communication"}
            </h2>

            <form className="communications-form" onSubmit={handleSubmit}>
              <div className="communications-field">
                <label htmlFor="communication-title">Title</label>
                <input
                  id="communication-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Brief summary of this communication"
                  disabled={saving || deleting}
                  required
                />
              </div>

              <div className="communications-field">
                <label htmlFor="communication-category">Category</label>
                <select
                  id="communication-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: normalizeCommunicationCategory(e.target.value),
                    }))
                  }
                  disabled={saving || deleting}
                  required
                >
                  {COMMUNICATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="communications-field">
                <label htmlFor="communication-status">Status</label>
                <select
                  id="communication-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: normalizeCommunicationStatus(e.target.value),
                    }))
                  }
                  disabled={saving || deleting}
                  required
                >
                  {COMMUNICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="communications-field">
                <label htmlFor="communication-message">Message</label>
                <textarea
                  id="communication-message"
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="What was communicated, when, and any relevant details."
                  disabled={saving || deleting}
                  required
                />
              </div>

              <div className="communications-field">
                <span
                  id="communication-photos-label"
                  className="communications-field-label"
                >
                  Photos (optional)
                </span>
                <input
                  ref={attachmentInputRef}
                  id="communication-attachments"
                  type="file"
                  accept="image/*"
                  multiple
                  className="communications-file-input"
                  disabled={saving || deleting}
                  onChange={handleAttachmentFileChange}
                  aria-labelledby="communication-photos-label"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  className="communications-btn-secondary communications-attachment-upload-btn"
                  disabled={saving || deleting}
                  aria-labelledby="communication-photos-label"
                  aria-describedby="communication-attachments-hint"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  Upload Images
                </button>
                <p
                  id="communication-attachments-hint"
                  className="communications-attachments-hint"
                >
                  Add images. They are stored in your gallery and linked
                  to this communication.
                </p>
                {pendingAttachmentFiles.length > 0 ? (
                  <ul
                    className="communications-attachment-pending"
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
                <p className="communications-error" role="alert">
                  {error}
                </p>
              ) : null}

              {isEditMode ? (
                <div className="communications-modal-delete-row">
                  <button
                    type="button"
                    className="communications-btn-danger-ghost"
                    onClick={openDeleteConfirm}
                    disabled={saving || deleting}
                  >
                    Delete
                  </button>
                </div>
              ) : null}

              <div className="communications-modal-actions">
                <button
                  type="button"
                  className="communications-btn-secondary"
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
                      : "Save communication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalOpen && confirmDeleteOpen ? (
        <div
          className="communications-confirm-backdrop"
          role="presentation"
          onClick={closeDeleteConfirm}
        >
          <div
            className="communications-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-communication-title"
            aria-describedby="delete-communication-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-communication-title"
              className="communications-confirm-title"
            >
              Delete Apartment Communications Log?
            </h2>
            <p
              id="delete-communication-desc"
              className="communications-confirm-message"
            >
              This action will permanently remove this record.
            </p>
            {error && confirmDeleteOpen ? (
              <p className="communications-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="communications-confirm-actions">
              <button
                type="button"
                className="dashboard-btn-primary communications-confirm-cancel"
                style={{ marginTop: 0 }}
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="communications-btn-danger"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
