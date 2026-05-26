"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { formatLogDate, previewDescription } from "@/lib/maintenance/format";
import {
  buildMaintenanceLogTitle,
  getCategoryNames,
  getIssueTypesForCategory,
  MAINTENANCE_LOG_STATUSES,
  type MaintenanceLogStatus,
} from "@/lib/maintenance/logConfig";
import { fetchMaintenanceGalleryItems } from "@/lib/gallery/galleryRecords";
import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import {
  createMaintenanceLog,
  deleteMaintenanceLog,
  fetchMaintenanceLogsForHome,
  updateMaintenanceLog,
  updateMaintenanceLogStatus,
} from "@/lib/maintenance/maintenanceLogs";
import { uploadMaintenanceAttachments } from "@/lib/maintenance/maintenanceAttachments";
import type { MaintenanceLog } from "@/lib/maintenance/types";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import "./maintenance.css";

type ExistingAttachment = {
  id: string;
  storage_path: string;
  previewUrl: string;
};

const EMPTY_FORM = {
  category: "",
  issueType: "",
  status: "Active" as MaintenanceLogStatus,
  description: "",
};

function logToForm(log: MaintenanceLog) {
  return {
    category: log.category,
    issueType: log.issue_type,
    status: (log.status === "Resolved" ? "Resolved" : "Active") as MaintenanceLogStatus,
    description: log.description,
  };
}

export default function MaintenancePage() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;
  const isEditMode = editingLogId !== null;
  const categories = useMemo(() => getCategoryNames(), []);
  const issueTypes = useMemo(
    () => (form.category ? getIssueTypesForCategory(form.category) : []),
    [form.category]
  );

  const loadLogs = useCallback(async () => {
    if (!userId || !homeId) {
      setLogs([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setError(null);

    const result = await fetchMaintenanceLogsForHome(userId, homeId);

    if (!result.ok) {
      setError(result.message);
      setLogs([]);
      setListLoading(false);
      return;
    }

    setLogs(result.logs);
    setListLoading(false);
  }, [userId, homeId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadLogs();
  }, [dashboardLoading, loadLogs]);

  useEffect(() => {
    if (!form.category) {
      return;
    }

    const types = getIssueTypesForCategory(form.category);
    if (types.length === 0) {
      setForm((prev) => ({ ...prev, issueType: "" }));
      return;
    }

    if (!types.includes(form.issueType)) {
      setForm((prev) => ({ ...prev, issueType: types[0] }));
    }
  }, [form.category, form.issueType]);

  useEffect(() => {
    if (!modalOpen || !editingLogId || !userId || !homeId) {
      if (!modalOpen) {
        setExistingAttachments([]);
        setPendingAttachmentFiles([]);
        setAttachmentsLoading(false);
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      setAttachmentsLoading(true);

      const result = await fetchMaintenanceGalleryItems(
        userId,
        homeId,
        editingLogId
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setExistingAttachments([]);
        setAttachmentsLoading(false);
        return;
      }

      if (result.items.length === 0) {
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
  }, [modalOpen, editingLogId, userId, homeId]);

  const resetAttachmentState = () => {
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setAttachmentsLoading(false);
  };

  const openCreateModal = () => {
    setError(null);
    setEditingLogId(null);
    setConfirmDeleteOpen(false);
    resetAttachmentState();
    const firstCategory = categories[0] ?? "";
    setForm({
      ...EMPTY_FORM,
      category: firstCategory,
      issueType: firstCategory
        ? getIssueTypesForCategory(firstCategory)[0] ?? ""
        : "",
    });
    setModalOpen(true);
  };

  const openEditModal = (log: MaintenanceLog) => {
    setError(null);
    setEditingLogId(log.id);
    setConfirmDeleteOpen(false);
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setForm(logToForm(log));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || deleting) {
      return;
    }

    setModalOpen(false);
    setConfirmDeleteOpen(false);
    setEditingLogId(null);
    setForm(EMPTY_FORM);
    resetAttachmentState();
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
    maintenanceLogId: string
  ): Promise<string | null> => {
    if (!userId || !homeId || pendingAttachmentFiles.length === 0) {
      return null;
    }

    const result = await uploadMaintenanceAttachments({
      userId,
      homeId,
      maintenanceLogId,
      files: pendingAttachmentFiles,
    });

    if (!result.ok) {
      return result.message;
    }

    setPendingAttachmentFiles([]);
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !homeId) {
      setError("Select an active home before logging maintenance.");
      return;
    }

    if (!form.category || !form.issueType) {
      setError("Choose a category and issue type.");
      return;
    }

    setSaving(true);
    setError(null);

    if (isEditMode && editingLogId) {
      const result = await updateMaintenanceLog({
        id: editingLogId,
        userId,
        category: form.category,
        issueType: form.issueType,
        description: form.description,
        status: form.status,
      });

      if (!result.ok) {
        setSaving(false);
        setError(result.message);
        return;
      }

      const attachmentError = await uploadPendingAttachments(editingLogId);
      if (attachmentError) {
        setSaving(false);
        setError(
          `Maintenance log saved, but photos could not be uploaded: ${attachmentError}`
        );
        return;
      }

      setSaving(false);
      setModalOpen(false);
      setConfirmDeleteOpen(false);
      setEditingLogId(null);
      setForm(EMPTY_FORM);
      resetAttachmentState();
      await loadLogs();
      return;
    }

    const result = await createMaintenanceLog({
      userId,
      homeId,
      category: form.category,
      issueType: form.issueType,
      description: form.description,
      status: form.status,
    });

    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }

    const attachmentError = await uploadPendingAttachments(result.log.id);
    if (attachmentError) {
      setSaving(false);
      setError(
        `Maintenance log saved, but photos could not be uploaded: ${attachmentError}`
      );
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setEditingLogId(null);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    await loadLogs();
  };

  const handleStatusToggle = async (
    e: React.MouseEvent,
    log: MaintenanceLog
  ) => {
    e.stopPropagation();

    if (!userId || statusTogglingId) {
      return;
    }

    const nextStatus: MaintenanceLogStatus =
      log.status === "Resolved" ? "Active" : "Resolved";

    setStatusTogglingId(log.id);
    setError(null);

    const result = await updateMaintenanceLogStatus(log.id, userId, nextStatus);

    if (!result.ok) {
      setStatusTogglingId(null);
      setError(result.message);
      return;
    }

    setLogs((prev) =>
      prev.map((row) => (row.id === log.id ? result.log : row))
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
    if (!userId || !editingLogId) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteMaintenanceLog(editingLogId, userId);

    if (!result.ok) {
      setDeleting(false);
      setError(result.message);
      return;
    }

    setDeleting(false);
    setConfirmDeleteOpen(false);
    setModalOpen(false);
    setEditingLogId(null);
    setForm(EMPTY_FORM);
    await loadLogs();
  };

  if (dashboardLoading) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Maintenance Logs</h1>
        <p className="dashboard-subtitle">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Maintenance Logs</h1>
        <p className="dashboard-subtitle">
          Sign in to document maintenance for your rental.
        </p>
      </div>
    );
  }

  if (!homeId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Maintenance Logs</h1>
        <p className="dashboard-subtitle">
          Set up your current home on the dashboard before logging maintenance.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container maintenance-page">
      <header className="maintenance-header">
        <div className="maintenance-header-text">
          <h1 className="dashboard-title">Maintenance Logs</h1>
          <p className="dashboard-subtitle">
            Track repairs, safety concerns, and landlord communication for your
            home. Structured records you can use as documentation later.
          </p>
        </div>
        <div className="maintenance-header-actions">
          <button
            type="button"
            className="dashboard-btn-primary"
            onClick={openCreateModal}
          >
            Log Maintenance
          </button>
        </div>
      </header>

      {error && !modalOpen ? (
        <p className="maintenance-error" role="alert">
          {error}
        </p>
      ) : null}

      {listLoading ? (
        <p className="dashboard-subtitle">Loading maintenance logs…</p>
      ) : logs.length === 0 ? (
        <div className="maintenance-empty" aria-label="No maintenance logs yet">
          <p className="dashboard-subtitle" style={{ margin: 0 }}>
            No maintenance logged yet. Add your first entry to start your record.
          </p>
        </div>
      ) : (
        <ul className="maintenance-list" aria-label="Maintenance logs">
          {logs.map((log) => {
            const isResolved = log.status === "Resolved";
            const toggling = statusTogglingId === log.id;

            return (
              <li
                key={log.id}
                className={
                  isResolved
                    ? "maintenance-card maintenance-card--resolved"
                    : "maintenance-card maintenance-card--active"
                }
              >
                <button
                  type="button"
                  className="maintenance-card-hit"
                  onClick={() => openEditModal(log)}
                >
                  <div className="maintenance-card-top">
                    <h2 className="maintenance-card-title">{log.title}</h2>
                    <div className="maintenance-card-meta">
                      <span
                        className={
                          isResolved
                            ? "maintenance-badge maintenance-badge--resolved"
                            : "maintenance-badge maintenance-badge--active"
                        }
                      >
                        {log.status}
                      </span>
                      <span>{formatLogDate(log.created_at)}</span>
                    </div>
                  </div>
                  <p className="maintenance-card-meta">
                    <span className="maintenance-card-category">
                      {log.category}
                    </span>
                  </p>
                  <p className="maintenance-card-description">
                    {previewDescription(log.description)}
                  </p>
                </button>
                <div className="maintenance-card-actions">
                  <button
                    type="button"
                    className="maintenance-btn-secondary maintenance-card-action"
                    disabled={toggling}
                    onClick={(e) => void handleStatusToggle(e, log)}
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
          className="maintenance-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="maintenance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-maintenance-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="log-maintenance-title" className="maintenance-modal-title">
              {isEditMode ? "Edit Maintenance Log" : "Log Maintenance"}
            </h2>
            <p className="maintenance-modal-subtitle">
              {buildMaintenanceLogTitle(
                form.category || "Category",
                form.issueType || "Type"
              )}
            </p>

            <form className="maintenance-form" onSubmit={handleSubmit}>
              <div className="maintenance-field">
                <label htmlFor="maintenance-category">Category</label>
                <select
                  id="maintenance-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                      issueType: "",
                    }))
                  }
                  disabled={saving || deleting}
                  required
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field">
                <label htmlFor="maintenance-issue-type">Issue type</label>
                <select
                  id="maintenance-issue-type"
                  value={form.issueType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, issueType: e.target.value }))
                  }
                  disabled={saving || deleting || issueTypes.length === 0}
                  required
                >
                  {issueTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field">
                <label htmlFor="maintenance-status">Status</label>
                <select
                  id="maintenance-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as MaintenanceLogStatus,
                    }))
                  }
                  disabled={saving || deleting}
                  required
                >
                  {MAINTENANCE_LOG_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field">
                <label htmlFor="maintenance-description">Description</label>
                <textarea
                  id="maintenance-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What happened, when you noticed it, and any impact on your home."
                  disabled={saving || deleting}
                  required
                />
              </div>

              <div className="maintenance-field">
                <span
                  id="maintenance-photos-label"
                  className="maintenance-field-label"
                >
                  Photos (optional)
                </span>
                <input
                  ref={attachmentInputRef}
                  id="maintenance-attachments"
                  type="file"
                  accept="image/*"
                  multiple
                  className="maintenance-file-input"
                  disabled={saving || deleting}
                  onChange={handleAttachmentFileChange}
                  aria-labelledby="maintenance-photos-label"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  className="maintenance-btn-secondary maintenance-attachment-upload-btn"
                  disabled={saving || deleting}
                  aria-labelledby="maintenance-photos-label"
                  aria-describedby="maintenance-attachments-hint"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  Upload Images
                </button>
                <p
                  id="maintenance-attachments-hint"
                  className="maintenance-attachments-hint"
                >
                  Add images. They are stored in your gallery and linked
                  to this maintenance log.
                </p>
                {attachmentsLoading ? (
                  <p className="maintenance-attachments-hint">
                    Loading existing photos…
                  </p>
                ) : null}
                {existingAttachments.length > 0 ? (
                  <ul
                    className="maintenance-attachment-list"
                    aria-label="Existing photos"
                  >
                    {existingAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="maintenance-attachment-thumb"
                          />
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
                {pendingAttachmentFiles.length > 0 ? (
                  <ul
                    className="maintenance-attachment-pending"
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
                <p className="maintenance-error" role="alert">
                  {error}
                </p>
              ) : null}

              {isEditMode ? (
                <div className="maintenance-modal-delete-row">
                  <button
                    type="button"
                    className="maintenance-btn-danger-ghost"
                    onClick={openDeleteConfirm}
                    disabled={saving || deleting}
                  >
                    Delete
                  </button>
                </div>
              ) : null}

              <div className="maintenance-modal-actions">
                <button
                  type="button"
                  className="maintenance-btn-secondary"
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
                      : "Save log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalOpen && confirmDeleteOpen ? (
        <div
          className="maintenance-confirm-backdrop"
          role="presentation"
          onClick={closeDeleteConfirm}
        >
          <div
            className="maintenance-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-maintenance-title"
            aria-describedby="delete-maintenance-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-maintenance-title"
              className="maintenance-confirm-title"
            >
              Delete Maintenance Log?
            </h2>
            <p id="delete-maintenance-desc" className="maintenance-confirm-message">
              This action will permanently remove this record.
            </p>
            {error && confirmDeleteOpen ? (
              <p className="maintenance-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="maintenance-confirm-actions">
              <button
                type="button"
                className="dashboard-btn-primary maintenance-confirm-cancel"
                style={{ marginTop: 0 }}
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="maintenance-btn-danger"
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
