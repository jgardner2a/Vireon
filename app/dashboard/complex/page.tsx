"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertEvidenceLogImageFilesOnly } from "@/lib/attachments/evidenceLogImageFiles";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import { PlanUsageHints } from "@/app/dashboard/_components/PlanUsageHints";
import { useDetailAttachments } from "@/lib/dashboard/useDetailAttachments";
import { formatLogDate, previewDescription } from "@/lib/maintenance/format";
import {
  buildComplexIssueTitle,
  getCategoryNames,
  getIssueTypesForCategory,
  COMPLEX_ISSUE_STATUSES,
  type ComplexIssueStatus,
} from "@/lib/complex/logConfig";
import { resolveSignedGalleryUrls } from "@/lib/gallerySignedUrlCache";
import {
  createComplexIssue,
  deleteComplexIssue,
  fetchComplexIssuesForHome,
  updateComplexIssue,
  updateComplexIssueStatus,
} from "@/lib/complex/complexIssues";
import {
  fetchComplexAttachments,
  uploadComplexAttachments,
} from "@/lib/complex/complexAttachments";
import type { ComplexIssue } from "@/lib/complex/types";
import { STORAGE_BUCKET } from "@/lib/storagePath";
import "./complex.css";

type ExistingAttachment = {
  id: string;
  storage_path: string;
  previewUrl: string;
};

const EMPTY_FORM = {
  category: "",
  issueType: "",
  status: "Active" as ComplexIssueStatus,
  description: "",
};

function issueToForm(issue: ComplexIssue) {
  return {
    category: issue.category,
    issueType: issue.issue_type,
    status: (issue.status === "Resolved" ? "Resolved" : "Active") as ComplexIssueStatus,
    description: issue.description,
  };
}

export default function ComplexPage() {
  const { state, loading: dashboardLoading } = useDashboardState();
  const [issues, setIssues] = useState<ComplexIssue[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<"view" | "edit">("view");
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const userId = state?.userId ?? null;
  const homeId = state?.currentHomeId ?? null;
  const categories = useMemo(() => getCategoryNames(), []);
  const issueTypes = useMemo(
    () => (form.category ? getIssueTypesForCategory(form.category) : []),
    [form.category]
  );

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedItemId) ?? null,
    [issues, selectedItemId]
  );

  const activeIssueId = selectedIssue?.id ?? null;
  const isSidebarEdit = sidebarMode === "edit" && activeIssueId != null;

  const { attachments: detailAttachments, loading: detailAttachmentsLoading } =
    useDetailAttachments(userId, homeId, selectedItemId, fetchComplexAttachments);

  const propertyLabel = useMemo(() => {
    if (!selectedIssue) {
      return null;
    }
    const home = state?.homes.find((entry) => entry.id === selectedIssue.home_id);
    return home?.name ?? state?.currentHome?.name ?? null;
  }, [selectedIssue, state?.homes, state?.currentHome?.name]);

  const loadIssues = useCallback(async () => {
    if (!userId || !homeId) {
      setIssues([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setError(null);

    const result = await fetchComplexIssuesForHome(userId, homeId);

    if (!result.ok) {
      setError(result.message);
      setIssues([]);
      setListLoading(false);
      return;
    }

    setIssues(result.issues);
    setListLoading(false);
  }, [userId, homeId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadIssues();
  }, [dashboardLoading, loadIssues]);

  useEffect(() => {
    if (selectedItemId && !issues.some((issue) => issue.id === selectedItemId)) {
      setSelectedItemId(null);
      setSidebarMode("view");
    }
  }, [issues, selectedItemId]);

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
    if (sidebarMode !== "edit" || !selectedIssue?.id || !userId || !homeId) {
      if (sidebarMode !== "edit") {
        setExistingAttachments([]);
        setPendingAttachmentFiles([]);
        setAttachmentsLoading(false);
      }
      return;
    }

    const logId = selectedIssue.id;
    let cancelled = false;

    void (async () => {
      setAttachmentsLoading(true);

      const result = await fetchComplexAttachments(
        userId,
        homeId,
        logId
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
  }, [sidebarMode, selectedIssue?.id, userId, homeId]);

  const resetAttachmentState = () => {
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setAttachmentsLoading(false);
  };

  const openCreateModal = () => {
    setError(null);
    setSidebarMode("view");
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

  const openSidebarEdit = (issue: ComplexIssue) => {
    setError(null);
    setSelectedItemId(issue.id);
    setConfirmDeleteOpen(false);
    setPendingAttachmentFiles([]);
    setExistingAttachments([]);
    setForm(issueToForm(issue));
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

  const selectIssue = (logId: string) => {
    setSelectedItemId(logId);
    if (sidebarMode === "edit") {
      setSidebarMode("view");
      setForm(EMPTY_FORM);
      resetAttachmentState();
      setConfirmDeleteOpen(false);
    } else {
      setSidebarMode("view");
    }
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
    complexIssueId: string
  ): Promise<string | null> => {
    if (!userId || !homeId || pendingAttachmentFiles.length === 0) {
      return null;
    }

    const result = await uploadComplexAttachments({
      userId,
      homeId,
      complexIssueId,
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
      setError("Select an active home before logging complex issues.");
      return;
    }

    if (!form.category || !form.issueType) {
      setError("Choose a category and issue type.");
      return;
    }

    setSaving(true);
    setError(null);

    if (sidebarMode === "edit" && selectedIssue) {
      const result = await updateComplexIssue({
        id: selectedIssue.id,
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

      const attachmentError = await uploadPendingAttachments(selectedIssue.id);
      if (attachmentError) {
        setSaving(false);
        setError(
          `Complex issue saved, but photos could not be uploaded: ${attachmentError}`
        );
        return;
      }

      setSaving(false);
      setConfirmDeleteOpen(false);
      setForm(EMPTY_FORM);
      resetAttachmentState();
      setSidebarMode("view");
      await loadIssues();
      return;
    }

    const result = await createComplexIssue({
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

    const attachmentError = await uploadPendingAttachments(result.issue.id);
    if (attachmentError) {
      setSaving(false);
      setError(
        `Complex issue saved, but photos could not be uploaded: ${attachmentError}`
      );
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    resetAttachmentState();
    setSelectedItemId(result.issue.id);
    await loadIssues();
  };

  const handleStatusToggle = async (
    e: React.MouseEvent,
    issue: ComplexIssue
  ) => {
    e.stopPropagation();

    if (!userId || statusTogglingId) {
      return;
    }

    const nextStatus: ComplexIssueStatus =
      issue.status === "Resolved" ? "Active" : "Resolved";

    setStatusTogglingId(issue.id);
    setError(null);

    const result = await updateComplexIssueStatus(issue.id, userId, nextStatus);

    if (!result.ok) {
      setStatusTogglingId(null);
      setError(result.message);
      return;
    }

    setIssues((prev) =>
      prev.map((row) => (row.id === issue.id ? result.issue : row))
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
    if (!userId || !selectedIssue) {
      return;
    }

    const logId = selectedIssue.id;

    setDeleting(true);
    setError(null);

    const result = await deleteComplexIssue(logId, userId);

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
    if (selectedItemId === logId) {
      setSelectedItemId(null);
    }
    await loadIssues();
  };

  if (dashboardLoading) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Complex Issues</h1>
        <p className="dashboard-subtitle">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Complex Issues</h1>
        <p className="dashboard-subtitle">
          Sign in to document complex issues for your building.
        </p>
      </div>
    );
  }

  if (!homeId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Complex Issues</h1>
        <p className="dashboard-subtitle">
          Set up your current home on the dashboard before logging complex issues.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container dashboard-container--split complex-page">
      <header className="complex-header">
        <div className="complex-header-text">
          <h1 className="dashboard-title">Complex Issues</h1>
          <p className="dashboard-subtitle">
            Track building-wide and shared-area concerns for your complex. Structured records you can use as documentation later.
          </p>
        </div>
        <div className="complex-header-actions">
          <button
            type="button"
            className="dashboard-btn-primary"
            onClick={openCreateModal}
          >
            Log Complex Issue
          </button>
        </div>
      </header>

      <PlanUsageHints variant="logs-only" refreshToken={issues.length} />

      {error && !modalOpen ? (
        <p className="complex-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dashboard-split">
        <div className="dashboard-split__list">
          {listLoading ? (
            <p className="dashboard-subtitle">Loading Complex Issues…</p>
          ) : issues.length === 0 ? (
            <div
              className="complex-empty"
              aria-label="No Complex Issues yet"
            >
              <p className="dashboard-subtitle" style={{ margin: 0 }}>
                No complex issues logged yet. Add your first entry to start your
                record.
              </p>
            </div>
          ) : (
            <ul className="complex-list" aria-label="Complex Issues">
              {issues.map((issue) => {
                const isResolved = issue.status === "Resolved";
                const toggling = statusTogglingId === issue.id;
                const isSelected = issue.id === selectedItemId;

                return (
                  <li
                    key={issue.id}
                    className={
                      isResolved
                        ? `complex-card complex-card--resolved${isSelected ? " complex-card--selected" : ""}`
                        : `complex-card complex-card--active${isSelected ? " complex-card--selected" : ""}`
                    }
                  >
                    <button
                      type="button"
                      className="complex-card-hit"
                      onClick={() => selectIssue(issue.id)}
                    >
                      <div className="complex-card-top">
                        <h2 className="complex-card-title">{issue.title}</h2>
                        <div className="complex-card-meta">
                          <span
                            className={
                              isResolved
                                ? "complex-badge complex-badge--resolved"
                                : "complex-badge complex-badge--active"
                            }
                          >
                            {issue.status}
                          </span>
                          <span>{formatLogDate(issue.created_at)}</span>
                        </div>
                      </div>
                      <p className="complex-card-meta">
                        <span className="complex-card-category">
                          {issue.category}
                        </span>
                      </p>
                      <p className="complex-card-description">
                        {previewDescription(issue.description)}
                      </p>
                    </button>
                    <div className="complex-card-actions">
                      <button
                        type="button"
                        className="complex-btn-secondary complex-card-action"
                        disabled={toggling}
                        onClick={(e) => void handleStatusToggle(e, issue)}
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
          aria-label="Complex issue details"
        >
          {!selectedIssue ? (
            <p className="dashboard-detail-panel__empty">
              Select a complex issue to view details.
            </p>
          ) : isSidebarEdit ? (
            <div className="dashboard-detail-panel">
              <h2 className="complex-modal-title">Edit Complex Issue</h2>
              <p className="complex-modal-subtitle">
                {buildComplexIssueTitle(
                  form.category || "Category",
                  form.issueType || "Type"
                )}
              </p>

              <form className="complex-form" onSubmit={handleSubmit}>
                <div className="complex-field">
                  <label htmlFor="sidebar-complex-category">Category</label>
                  <select
                    id="sidebar-complex-category"
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

                <div className="complex-field">
                  <label htmlFor="sidebar-complex-issue-type">
                    Issue type
                  </label>
                  <select
                    id="sidebar-complex-issue-type"
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

                <div className="complex-field">
                  <label htmlFor="sidebar-complex-status">Status</label>
                  <select
                    id="sidebar-complex-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as ComplexIssueStatus,
                      }))
                    }
                    disabled={saving || deleting}
                    required
                  >
                    {COMPLEX_ISSUE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="complex-field">
                  <label htmlFor="sidebar-complex-description">
                    Description
                  </label>
                  <textarea
                    id="sidebar-complex-description"
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What happened in the building or shared areas, when you noticed it, and any impact."
                    disabled={saving || deleting}
                    required
                  />
                </div>

                <div className="complex-field">
                  <span
                    id="sidebar-complex-photos-label"
                    className="complex-field-label"
                  >
                    Photos (optional)
                  </span>
                  <input
                    ref={attachmentInputRef}
                    id="sidebar-complex-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    className="complex-file-input"
                    disabled={saving || deleting}
                    onChange={handleAttachmentFileChange}
                    aria-labelledby="sidebar-complex-photos-label"
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    className="complex-btn-secondary complex-attachment-upload-btn"
                    disabled={saving || deleting}
                    aria-labelledby="sidebar-complex-photos-label"
                    aria-describedby="sidebar-complex-attachments-hint"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    Upload Images
                  </button>
                  <p
                    id="sidebar-complex-attachments-hint"
                    className="complex-attachments-hint"
                  >
                    Add images linked to this complex issue as attachments.
                  </p>
                  {attachmentsLoading ? (
                    <p className="complex-attachments-hint">
                      Loading existing photos…
                    </p>
                  ) : null}
                  {existingAttachments.length > 0 ? (
                    <ul
                      className="complex-attachment-list"
                      aria-label="Existing photos"
                    >
                      {existingAttachments.map((attachment) =>
                        attachment.previewUrl ? (
                          <li key={attachment.id}>
                            <img
                              src={attachment.previewUrl}
                              alt=""
                              className="complex-attachment-thumb"
                            />
                          </li>
                        ) : null
                      )}
                    </ul>
                  ) : null}
                  {pendingAttachmentFiles.length > 0 ? (
                    <ul
                      className="complex-attachment-pending"
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
                  <p className="complex-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="complex-modal-delete-row">
                  <button
                    type="button"
                    className="complex-btn-danger-ghost"
                    onClick={openDeleteConfirm}
                    disabled={saving || deleting}
                  >
                    Delete
                  </button>
                </div>

                <div className="complex-modal-actions">
                  <button
                    type="button"
                    className="complex-btn-secondary"
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
                  {selectedIssue.title}
                </h2>
                <div className="dashboard-detail-panel__actions">
                  <button
                    type="button"
                    className="complex-btn-secondary"
                    onClick={() => openSidebarEdit(selectedIssue)}
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
                      selectedIssue.status === "Resolved"
                        ? "complex-badge complex-badge--resolved"
                        : "complex-badge complex-badge--active"
                    }
                  >
                    {selectedIssue.status}
                  </span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Created
                  </span>
                  <span>{formatLogDate(selectedIssue.created_at)}</span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Category
                  </span>
                  <span>{selectedIssue.category}</span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Issue type
                  </span>
                  <span>{selectedIssue.issue_type}</span>
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
                  Description
                </h3>
                <p className="dashboard-detail-panel__body-text">
                  {selectedIssue.description}
                </p>
              </section>

              <section className="dashboard-detail-panel__section">
                <h3 className="dashboard-detail-panel__section-title">
                  Attachments
                </h3>
                {detailAttachmentsLoading ? (
                  <p className="complex-attachments-hint">
                    Loading photos…
                  </p>
                ) : null}
                {!detailAttachmentsLoading &&
                detailAttachments.length === 0 ? (
                  <p className="complex-attachments-hint">
                    No photos attached.
                  </p>
                ) : null}
                {detailAttachments.length > 0 ? (
                  <ul
                    className="complex-attachment-list"
                    aria-label="Attached photos"
                  >
                    {detailAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="complex-attachment-thumb"
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
          className="complex-modal-backdrop"
          role="presentation"
          onClick={closeCreateModal}
        >
          <div
            className="complex-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-complex-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="log-complex-title" className="complex-modal-title">
              Log Complex Issue
            </h2>
            <p className="complex-modal-subtitle">
              {buildComplexIssueTitle(
                form.category || "Category",
                form.issueType || "Type"
              )}
            </p>

            <form className="complex-form" onSubmit={handleSubmit}>
              <div className="complex-field">
                <label htmlFor="complex-category">Category</label>
                <select
                  id="complex-category"
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

              <div className="complex-field">
                <label htmlFor="complex-issue-type">Issue type</label>
                <select
                  id="complex-issue-type"
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

              <div className="complex-field">
                <label htmlFor="complex-status">Status</label>
                <select
                  id="complex-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as ComplexIssueStatus,
                    }))
                  }
                  disabled={saving || deleting}
                  required
                >
                  {COMPLEX_ISSUE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="complex-field">
                <label htmlFor="complex-description">Description</label>
                <textarea
                  id="complex-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What happened in the building or shared areas, when you noticed it, and any impact."
                  disabled={saving || deleting}
                  required
                />
              </div>

              <div className="complex-field">
                <span
                  id="complex-photos-label"
                  className="complex-field-label"
                >
                  Photos (optional)
                </span>
                <input
                  ref={attachmentInputRef}
                  id="complex-attachments"
                  type="file"
                  accept="image/*"
                  multiple
                  className="complex-file-input"
                  disabled={saving || deleting}
                  onChange={handleAttachmentFileChange}
                  aria-labelledby="complex-photos-label"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  className="complex-btn-secondary complex-attachment-upload-btn"
                  disabled={saving || deleting}
                  aria-labelledby="complex-photos-label"
                  aria-describedby="complex-attachments-hint"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  Upload Images
                </button>
                <p
                  id="complex-attachments-hint"
                  className="complex-attachments-hint"
                >
                  Add images linked to this complex issue as attachments.
                </p>
                {attachmentsLoading ? (
                  <p className="complex-attachments-hint">
                    Loading existing photos…
                  </p>
                ) : null}
                {existingAttachments.length > 0 ? (
                  <ul
                    className="complex-attachment-list"
                    aria-label="Existing photos"
                  >
                    {existingAttachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <li key={attachment.id}>
                          <img
                            src={attachment.previewUrl}
                            alt=""
                            className="complex-attachment-thumb"
                          />
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
                {pendingAttachmentFiles.length > 0 ? (
                  <ul
                    className="complex-attachment-pending"
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
                <p className="complex-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="complex-modal-actions">
                <button
                  type="button"
                  className="complex-btn-secondary"
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
                  {saving ? "Saving…" : "Save issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDeleteOpen ? (
        <div
          className="complex-confirm-backdrop"
          role="presentation"
          onClick={closeDeleteConfirm}
        >
          <div
            className="complex-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-complex-title"
            aria-describedby="delete-complex-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-complex-title"
              className="complex-confirm-title"
            >
              Delete Complex Issue?
            </h2>
            <p id="delete-complex-desc" className="complex-confirm-message">
              This action will permanently remove this record.
            </p>
            {error && confirmDeleteOpen ? (
              <p className="complex-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="complex-confirm-actions">
              <button
                type="button"
                className="dashboard-btn-primary complex-confirm-cancel"
                style={{ marginTop: 0 }}
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="complex-btn-danger"
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

