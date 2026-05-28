"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { useDetailAttachments } from "@/lib/dashboard/useDetailAttachments";
import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_STATUSES,
  DEFAULT_COMMUNICATION_CATEGORY,
  normalizeCommunicationCategory,
  normalizeCommunicationStatus,
  type CommunicationCategory,
  type CommunicationStatus,
} from "@/lib/communications/communicationConfig";
import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import {
  fetchCommunicationAttachments,
  uploadCommunicationAttachments,
} from "@/lib/communications/communicationsAttachments";
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
import { STORAGE_BUCKET } from "@/lib/storagePath";
import "./communications.css";

type ExistingAttachment = {
  id: string;
  storage_path: string;
  previewUrl: string;
};

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<CommunicationFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
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

  const selectedCommunication = useMemo(
    () =>
      communications.find((row) => row.id === selectedItemId) ?? null,
    [communications, selectedItemId]
  );

  const isSidebarEdit = sidebarMode === "edit" && selectedCommunication != null;

  const { attachments: detailAttachments, loading: detailAttachmentsLoading } =
    useDetailAttachments(
      userId,
      homeId,
      selectedItemId,
      fetchCommunicationAttachments
    );

  const propertyLabel = useMemo(() => {
    if (!selectedCommunication) {
      return null;
    }
    const home = state?.homes.find(
      (entry) => entry.id === selectedCommunication.home_id
    );
    return home?.name ?? state?.currentHome?.name ?? null;
  }, [selectedCommunication, state?.homes, state?.currentHome?.name]);

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

  useEffect(() => {
    if (
      selectedItemId &&
      !communications.some((row) => row.id === selectedItemId)
    ) {
      setSelectedItemId(null);
      setSidebarMode("view");
    }
  }, [communications, selectedItemId]);

  useEffect(() => {
    if (sidebarMode !== "edit" || !selectedCommunication?.id || !userId || !homeId) {
      if (sidebarMode !== "edit") {
        setExistingAttachments([]);
        setPendingAttachmentFiles([]);
        setAttachmentsLoading(false);
      }
      return;
    }

    const communicationId = selectedCommunication.id;
    let cancelled = false;

    void (async () => {
      setAttachmentsLoading(true);

      const result = await fetchCommunicationAttachments(
        userId,
        homeId,
        communicationId
      );

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
  }, [sidebarMode, selectedCommunication?.id, userId, homeId]);

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

    const images = picked.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return;
    }

    setPendingAttachmentFiles((prev) => [...prev, ...images]);
  };

  const uploadPendingAttachments = async (
    communicationId: string
  ): Promise<string | null> => {
    if (!userId || !homeId || pendingAttachmentFiles.length === 0) {
      return null;
    }

    const result = await uploadCommunicationAttachments({
      userId,
      homeId,
      communicationId,
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

  const openSidebarEdit = (communication: Communication) => {
    setError(null);
    setSelectedItemId(communication.id);
    setConfirmDeleteOpen(false);
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setForm(communicationToForm(communication));
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

  const selectCommunication = (communicationId: string) => {
    setSelectedItemId(communicationId);
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

    if (sidebarMode === "edit" && selectedCommunication) {
      const result = await updateCommunication({
        id: selectedCommunication.id,
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

      const attachmentError = await uploadPendingAttachments(
        selectedCommunication.id
      );
      if (attachmentError) {
        setSaving(false);
        setError(
          `Communication saved, but photos could not be uploaded: ${attachmentError}`
        );
        return;
      }

      setSaving(false);
      setConfirmDeleteOpen(false);
      setForm(EMPTY_FORM);
      resetAttachmentState();
      setSidebarMode("view");
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

    const attachmentError = await uploadPendingAttachments(
      result.communication.id
    );
    if (attachmentError) {
      setSaving(false);
      setError(
        `Communication saved, but photos could not be uploaded: ${attachmentError}`
      );
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    setSelectedItemId(result.communication.id);
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
    if (!userId || !selectedCommunication) {
      return;
    }

    const communicationId = selectedCommunication.id;

    setDeleting(true);
    setError(null);

    const result = await deleteCommunication(communicationId, userId);

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
    if (selectedItemId === communicationId) {
      setSelectedItemId(null);
    }
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
    <div className="dashboard-container dashboard-container--split communications-page">
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

      <div className="dashboard-split">
        <div className="dashboard-split__list">
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
            <ul
              className="communications-list"
              aria-label="Apartment communications"
            >
              {communications.map((communication) => {
                const isResolved = communication.status === "Resolved";
                const toggling = statusTogglingId === communication.id;
                const isSelected = communication.id === selectedItemId;

                return (
                  <li
                    key={communication.id}
                    className={
                      isResolved
                        ? `communications-card communications-card--resolved${isSelected ? " communications-card--selected" : ""}`
                        : `communications-card communications-card--active${isSelected ? " communications-card--selected" : ""}`
                    }
                  >
                    <button
                      type="button"
                      className="communications-card-hit"
                      onClick={() => selectCommunication(communication.id)}
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
                        onClick={(e) =>
                          void handleStatusToggle(e, communication)
                        }
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
        </div>

        <aside
          className="dashboard-split__detail"
          aria-label="Communication details"
        >
          {!selectedCommunication ? (
            <p className="dashboard-detail-panel__empty">
              Select a communication to view details.
            </p>
          ) : isSidebarEdit ? (
            <div className="dashboard-detail-panel">
              <h2 className="communications-modal-title">
                Edit Apartment Communications Log
              </h2>

              <form className="communications-form" onSubmit={handleSubmit}>
                <div className="communications-field">
                  <label htmlFor="sidebar-communication-title">Title</label>
                  <input
                    id="sidebar-communication-title"
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
                  <label htmlFor="sidebar-communication-category">
                    Category
                  </label>
                  <select
                    id="sidebar-communication-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: normalizeCommunicationCategory(
                          e.target.value
                        ),
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
                  <label htmlFor="sidebar-communication-status">Status</label>
                  <select
                    id="sidebar-communication-status"
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
                  <label htmlFor="sidebar-communication-message">
                    Message
                  </label>
                  <textarea
                    id="sidebar-communication-message"
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
                    id="sidebar-communication-photos-label"
                    className="communications-field-label"
                  >
                    Photos (optional)
                  </span>
                  <input
                    ref={attachmentInputRef}
                    id="sidebar-communication-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    className="communications-file-input"
                    disabled={saving || deleting}
                    onChange={handleAttachmentFileChange}
                    aria-labelledby="sidebar-communication-photos-label"
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    className="communications-btn-secondary communications-attachment-upload-btn"
                    disabled={saving || deleting}
                    aria-labelledby="sidebar-communication-photos-label"
                    aria-describedby="sidebar-communication-attachments-hint"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    Upload Images
                  </button>
                  <p
                    id="sidebar-communication-attachments-hint"
                    className="communications-attachments-hint"
                  >
                    Add images linked to this communication as attachments.
                  </p>
                  {attachmentsLoading ? (
                    <p className="communications-attachments-hint">
                      Loading existing photos…
                    </p>
                  ) : null}
                  {existingAttachments.length > 0 ? (
                    <ul
                      className="communications-attachment-list"
                      aria-label="Existing photos"
                    >
                      {existingAttachments.map((attachment) =>
                        attachment.previewUrl ? (
                          <li key={attachment.id}>
                            <img
                              src={attachment.previewUrl}
                              alt=""
                              className="communications-attachment-thumb"
                            />
                          </li>
                        ) : null
                      )}
                    </ul>
                  ) : null}
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

                <div className="communications-modal-actions">
                  <button
                    type="button"
                    className="communications-btn-secondary"
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
                  {selectedCommunication.title}
                </h2>
                <div className="dashboard-detail-panel__actions">
                  <button
                    type="button"
                    className="communications-btn-secondary"
                    onClick={() => openSidebarEdit(selectedCommunication)}
                  >
                    Edit
                  </button>
                </div>
              </header>

              <div className="dashboard-detail-panel__meta">
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Status
                  </span>
                  <span
                    className={
                      selectedCommunication.status === "Resolved"
                        ? "communications-badge communications-badge--resolved"
                        : "communications-badge communications-badge--active"
                    }
                  >
                    {selectedCommunication.status}
                  </span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Created
                  </span>
                  <span>
                    {formatCommunicationDate(selectedCommunication.created_at)}
                  </span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Last updated
                  </span>
                  <span>
                    {formatCommunicationDate(
                      selectedCommunication.updated_at
                    )}
                  </span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Category
                  </span>
                  <span>{selectedCommunication.category}</span>
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
                <h3 className="dashboard-detail-panel__section-title">
                  Message
                </h3>
                <p className="dashboard-detail-panel__body-text">
                  {selectedCommunication.message}
                </p>
              </section>

              <section className="dashboard-detail-panel__section">
                <h3 className="dashboard-detail-panel__section-title">
                  Attachments
                </h3>
                {detailAttachmentsLoading ? (
                  <p className="communications-attachments-hint">
                    Loading photos…
                  </p>
                ) : null}
                {!detailAttachmentsLoading &&
                detailAttachments.length === 0 ? (
                  <p className="communications-attachments-hint">
                    No photos attached.
                  </p>
                ) : null}
                {detailAttachments.length > 0 ? (
                  <ul
                    className="communications-attachment-list"
                    aria-label="Attached photos"
                  >
                    {detailAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="communications-attachment-thumb"
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
          className="communications-modal-backdrop"
          role="presentation"
          onClick={closeCreateModal}
        >
          <div
            className="communications-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-communication-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="log-communication-title" className="communications-modal-title">
              Log Communication
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
                  Add images linked to this communication as attachments.
                </p>
                {attachmentsLoading ? (
                  <p className="communications-attachments-hint">
                    Loading existing photos…
                  </p>
                ) : null}
                {existingAttachments.length > 0 ? (
                  <ul
                    className="communications-attachment-list"
                    aria-label="Existing photos"
                  >
                    {existingAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="communications-attachment-thumb"
                          />
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
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

              <div className="communications-modal-actions">
                <button
                  type="button"
                  className="communications-btn-secondary"
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
                  {saving ? "Saving…" : "Save communication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDeleteOpen ? (
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
