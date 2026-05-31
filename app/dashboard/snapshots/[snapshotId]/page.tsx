"use client";

import { DashboardAlert } from "@/app/dashboard/_components/DashboardAlert";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dashboardHomeSnapshotsPath,
  ROUTE_DASHBOARD_MY_HOME,
} from "@/lib/appNavigation";
import { PlanFeatureGate } from "@/app/dashboard/_components/PlanFeatureGate";
import { useDashboardState } from "@/lib/dashboard/dashboardContext";
import {
  formatSnapshotDate,
  snapshotTypeLabel,
} from "@/lib/snapshots/format";
import {
  loadSnapshotCustomRooms,
  saveSnapshotCustomRooms,
} from "@/lib/snapshots/customRoomsStorage";
import {
  mergeSnapshotRooms,
  SNAPSHOT_ROOM_OTHER_SLUG,
  SNAPSHOT_ROOMS,
  slugifySnapshotRoomLabel,
  snapshotRoomLabel,
  normalizeSnapshotRoomSlug,
  type SnapshotRoom,
} from "@/lib/snapshots/roomConfig";
import {
  buildSnapshotDisplayImages,
  type SnapshotDisplayImage,
} from "@/lib/snapshots/snapshotDisplay";
import { addSnapshotIssue, getSnapshot } from "@/lib/snapshots/snapshots";
import { uploadSnapshotImage } from "@/lib/snapshots/uploadSnapshotImage";
import { assertCanStageSnapshotRoomImages } from "@/lib/billing/planLimitStaging";
import type { SnapshotIssue, SnapshotSeverity, SnapshotWithDetails } from "@/lib/snapshots/types";
import "../snapshots.css";

type RoomPanelData = {
  slug: string;
  label: string;
  images: SnapshotDisplayImage[];
};

function SnapshotThumb({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className ?? "snapshot-detail-photo-img"}
      loading="lazy"
    />
  );
}

function formatIssueSeverityMeta(issue: SnapshotIssue): string | null {
  if (!issue.severity) {
    return null;
  }
  const label =
    issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1);
  return `${label} severity`;
}

function formatRoomSummary(photoCount: number, issueCount: number): string {
  const parts: string[] = [];

  if (photoCount === 0) {
    parts.push("No photos");
  } else {
    parts.push(`${photoCount} photo${photoCount === 1 ? "" : "s"}`);
  }

  if (issueCount > 0) {
    parts.push(`${issueCount} issue${issueCount === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}

export default function SnapshotPage() {
  return (
    <PlanFeatureGate
      feature="snapshots"
      title="Snapshot"
      description="Move-in and move-out snapshot details for your property."
    >
      <SnapshotPageContent />
    </PlanFeatureGate>
  );
}

function SnapshotPageContent() {
  const params = useParams();
  const { state, loading: dashboardLoading } = useDashboardState();
  const [snapshot, setSnapshot] = useState<SnapshotWithDetails | null>(null);
  const [displayImages, setDisplayImages] = useState<SnapshotDisplayImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingRoom, setUploadingRoom] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRoomRef = useRef<string>(SNAPSHOT_ROOMS[0].slug);
  const [selectedRoomSlug, setSelectedRoomSlug] = useState<string | null>(null);
  const [issueModalRoom, setIssueModalRoom] = useState<string | null>(null);
  const [savingIssue, setSavingIssue] = useState(false);
  const [issueLabel, setIssueLabel] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"" | SnapshotSeverity>("");
  const [issueNotes, setIssueNotes] = useState("");
  const [customRooms, setCustomRooms] = useState<SnapshotRoom[]>([]);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [newRoomLabel, setNewRoomLabel] = useState("");

  const snapshotId =
    typeof params.snapshotId === "string" ? params.snapshotId : "";

  const home = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    return state?.homes.find((entry) => entry.id === snapshot.home_id) ?? null;
  }, [snapshot, state?.homes]);

  const allRooms = useMemo(
    () =>
      mergeSnapshotRooms(customRooms, displayImages, snapshot?.issues ?? []),
    [customRooms, displayImages, snapshot?.issues]
  );

  useEffect(() => {
    if (!snapshotId) {
      setCustomRooms([]);
      return;
    }

    setCustomRooms(loadSnapshotCustomRooms(snapshotId));
  }, [snapshotId]);

  const roomPanels = useMemo((): RoomPanelData[] => {
    const sortImages = (images: SnapshotDisplayImage[]) =>
      [...images].sort((a, b) => {
        const orderA = a.snapshotImage.order_index;
        const orderB = b.snapshotImage.order_index;
        if (orderA !== null && orderB !== null && orderA !== orderB) {
          return orderA - orderB;
        }
        return a.snapshotImage.created_at.localeCompare(
          b.snapshotImage.created_at
        );
      });

    const bySlug = new Map<string, SnapshotDisplayImage[]>();

    for (const room of allRooms) {
      bySlug.set(room.slug, []);
    }
    bySlug.set(SNAPSHOT_ROOM_OTHER_SLUG, []);

    const otherImages: SnapshotDisplayImage[] = [];

    for (const image of displayImages) {
      if (bySlug.has(image.roomSlug)) {
        bySlug.get(image.roomSlug)!.push(image);
      } else {
        otherImages.push(image);
      }
    }

    const panelFor = (room: { slug: string; label: string }): RoomPanelData => ({
      slug: room.slug,
      label: room.label,
      images: sortImages(bySlug.get(room.slug) ?? []),
    });

    const standardPanels = SNAPSHOT_ROOMS.map((room) => panelFor(room));

    const extraRooms = allRooms.filter(
      (room) =>
        !SNAPSHOT_ROOMS.some((standard) => standard.slug === room.slug) &&
        room.slug !== SNAPSHOT_ROOM_OTHER_SLUG
    );
    const extraPanels = extraRooms.map((room) => panelFor(room));

    const panels = [...standardPanels, ...extraPanels];

    if (otherImages.length > 0) {
      panels.push({
        slug: SNAPSHOT_ROOM_OTHER_SLUG,
        label: snapshotRoomLabel(SNAPSHOT_ROOM_OTHER_SLUG, customRooms),
        images: sortImages(otherImages),
      });
    }

    return panels;
  }, [allRooms, customRooms, displayImages]);

  const issuesByRoom = useMemo(() => {
    const groups = new Map<string, SnapshotIssue[]>();

    for (const room of allRooms) {
      groups.set(room.slug, []);
    }
    groups.set(SNAPSHOT_ROOM_OTHER_SLUG, []);

    for (const issue of snapshot?.issues ?? []) {
      const slug = normalizeSnapshotRoomSlug(issue.room);
      const target = groups.has(slug) ? slug : SNAPSHOT_ROOM_OTHER_SLUG;
      groups.get(target)!.push(issue);
    }

    return groups;
  }, [snapshot?.issues, allRooms]);

  const selectedPanel = useMemo(
    () => roomPanels.find((panel) => panel.slug === selectedRoomSlug) ?? null,
    [roomPanels, selectedRoomSlug]
  );

  const selectedIssues = useMemo(
    () =>
      selectedRoomSlug
        ? (issuesByRoom.get(selectedRoomSlug) ?? [])
        : [],
    [issuesByRoom, selectedRoomSlug]
  );

  useEffect(() => {
    if (
      selectedRoomSlug &&
      !roomPanels.some((panel) => panel.slug === selectedRoomSlug)
    ) {
      setSelectedRoomSlug(null);
    }
  }, [roomPanels, selectedRoomSlug]);

  const loadPageData = useCallback(async () => {
    if (!snapshotId) {
      setSnapshot(null);
      setDisplayImages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const snapshotResult = await getSnapshot(snapshotId);

    if (!snapshotResult.ok) {
      setError(snapshotResult.message);
      setSnapshot(null);
      setDisplayImages([]);
      setLoading(false);
      return;
    }

    const loaded = snapshotResult.snapshot;
    setSnapshot(loaded);

    const activeUserId = state?.userId;
    if (!activeUserId) {
      setError("Not signed in.");
      setSnapshot(null);
      setDisplayImages([]);
      setLoading(false);
      return;
    }

    const displayResult = await buildSnapshotDisplayImages(
      activeUserId,
      loaded.home_id,
      loaded.images
    );

    if (!displayResult.ok) {
      setError(displayResult.message);
      setDisplayImages([]);
      setLoading(false);
      return;
    }

    setDisplayImages(displayResult.images);
    setLoading(false);
  }, [snapshotId, state?.userId]);

  useEffect(() => {
    if (dashboardLoading) {
      return;
    }

    void loadPageData();
  }, [dashboardLoading, loadPageData]);

  const openUploadForRoom = (roomSlug: string) => {
    uploadTargetRoomRef.current = roomSlug;
    uploadInputRef.current?.click();
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!snapshot || !files?.length || uploadingRoom) {
      return;
    }

    const roomSlug = uploadTargetRoomRef.current;
    const fileArray = Array.from(files);

    const stageCheck = assertCanStageSnapshotRoomImages({
      plan: state?.plan ?? "free",
      existingCount: displayImages.filter((image) => image.roomSlug === roomSlug)
        .length,
      incomingCount: fileArray.length,
    });

    if (!stageCheck.ok) {
      setError(stageCheck.message);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      return;
    }

    setUploadingRoom(roomSlug);
    setError(null);

    for (const file of fileArray) {
      const result = await uploadSnapshotImage(snapshot.id, file, roomSlug);

      if (!result.ok) {
        setError(result.message);
        break;
      }
    }

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    setUploadingRoom(null);
    await loadPageData();
  };

  const closeIssueModal = () => {
    if (savingIssue) {
      return;
    }

    setIssueModalRoom(null);
    setIssueLabel("");
    setIssueSeverity("");
    setIssueNotes("");
    setError(null);
  };

  const openIssueModal = (roomSlug?: string) => {
    const slug = roomSlug ?? selectedRoomSlug;
    if (!slug) {
      return;
    }

    setIssueModalRoom(slug);
    setIssueLabel("");
    setIssueSeverity("");
    setIssueNotes("");
    setError(null);
  };

  const selectRoom = (roomSlug: string) => {
    setSelectedRoomSlug(roomSlug);
  };

  const handleAddIssueSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!snapshot || !issueModalRoom || savingIssue) {
      return;
    }

    setSavingIssue(true);
    setError(null);

    const result = await addSnapshotIssue(snapshot.id, {
      label: issueLabel,
      room: issueModalRoom,
      notes: issueNotes.trim() || undefined,
      severity: issueSeverity || undefined,
    });

    if (!result.ok) {
      setError(result.message);
      setSavingIssue(false);
      return;
    }

    setIssueModalRoom(null);
    setIssueLabel("");
    setIssueSeverity("");
    setIssueNotes("");
    setSavingIssue(false);
    await loadPageData();
  };

  const closeAddRoomModal = () => {
    setAddRoomModalOpen(false);
    setNewRoomLabel("");
  };

  const openAddRoomModal = () => {
    setAddRoomModalOpen(true);
    setNewRoomLabel("");
    setError(null);
  };

  const handleAddRoomSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = newRoomLabel.trim();
    if (!trimmed || !snapshotId) {
      return;
    }

    const existingSlugs = new Set(allRooms.map((room) => room.slug));
    const slug = slugifySnapshotRoomLabel(trimmed);

    if (existingSlugs.has(slug)) {
      setError(
        `“${snapshotRoomLabel(slug, customRooms)}” is already on this snapshot.`
      );
      return;
    }

    const room: SnapshotRoom = { slug, label: trimmed };
    const next = [...customRooms, room];
    setCustomRooms(next);
    saveSnapshotCustomRooms(snapshotId, next);
    setSelectedRoomSlug(slug);
    closeAddRoomModal();
    setError(null);
  };

  const roomActionBusy = uploadingRoom !== null || savingIssue;
  const issueModalOpen = issueModalRoom !== null;
  const anyModalOpen = issueModalOpen || addRoomModalOpen;
  const issueModalRoomLabel = issueModalRoom
    ? snapshotRoomLabel(issueModalRoom, customRooms)
    : "";

  if (dashboardLoading || loading) {
    return (
      <div className="dashboard-container">
        <p className="dashboard-loading" role="status">
          Loading snapshot…
        </p>
      </div>
    );
  }

  if (!snapshotId) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Snapshot</h1>
        <DashboardAlert message="Invalid snapshot link." />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Snapshot</h1>
        <DashboardAlert message={error ?? "Snapshot not found."} />
        <Link href={ROUTE_DASHBOARD_MY_HOME} style={{ fontSize: 14, color: "#111" }}>
          Back to My Home
        </Link>
      </div>
    );
  }

  const backHref = dashboardHomeSnapshotsPath(snapshot.home_id);
  const totalPhotos = displayImages.length;

  const isUploadingSelected =
    selectedRoomSlug !== null && uploadingRoom === selectedRoomSlug;

  return (
    <div className="dashboard-container dashboard-container--split snapshot-page">
      <header className="snapshot-header">
        <Link href={backHref} className="snapshot-header-back">
          ← Snapshots
        </Link>
        <h1 className="dashboard-title">
          {snapshotTypeLabel(snapshot.type)} Snapshot
        </h1>
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          {home?.name ?? "Property"} · {formatSnapshotDate(snapshot.created_at)}
          {totalPhotos > 0 ? ` · ${totalPhotos} photos` : ""}
        </p>
      </header>

      {error && !anyModalOpen ? (
        <DashboardAlert message={error} />
      ) : null}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="snapshot-hidden-file-input"
        disabled={roomActionBusy}
        onChange={(event) => void handleUploadFiles(event.target.files)}
      />

      <div className="dashboard-split">
        <div
          className="dashboard-split__list"
          aria-label="Rooms in this snapshot"
        >
          <ul className="snapshot-rooms-list">
            {roomPanels.map((panel) => {
              const photoCount = panel.images.length;
              const issueCount = issuesByRoom.get(panel.slug)?.length ?? 0;
              const isSelected = panel.slug === selectedRoomSlug;
              const previewImages = panel.images.slice(0, 2);

              return (
                <li
                  key={panel.slug}
                  className={
                    isSelected
                      ? "snapshot-room-card snapshot-room-card--selected"
                      : "snapshot-room-card"
                  }
                >
                  <button
                    type="button"
                    className="snapshot-room-card-hit"
                    onClick={() => selectRoom(panel.slug)}
                  >
                    <div className="snapshot-room-card-top">
                      <div>
                        <h2 className="snapshot-room-card-title">
                          {panel.label}
                        </h2>
                        <p className="snapshot-room-card-count">
                          {formatRoomSummary(photoCount, issueCount)}
                        </p>
                      </div>
                    </div>
                    {previewImages.length > 0 ? (
                      <div
                        className="snapshot-room-card-preview"
                        aria-hidden
                      >
                        {previewImages.map((image) => (
                          <figure
                            key={image.snapshotImage.id}
                            className="snapshot-room-card-preview-thumb"
                          >
                            <img
                              src={image.previewUrl}
                              alt=""
                              className="snapshot-room-card-preview-img"
                              loading="lazy"
                            />
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li className="snapshot-add-room-card">
              <button
                type="button"
                className="snapshot-add-room-btn"
                onClick={openAddRoomModal}
              >
                Add Room
              </button>
            </li>
          </ul>
        </div>

        <aside
          className="dashboard-split__detail"
          aria-label="Room details"
        >
          {!selectedPanel ? (
            <p className="dashboard-detail-panel__empty">
              Select a room to view photos and issues, or add new entries for
              that room.
            </p>
          ) : (
            <div className="dashboard-detail-panel">
              <header className="dashboard-detail-panel__header">
                <h2 className="dashboard-detail-panel__title">
                  {selectedPanel.label}
                </h2>
                <div className="dashboard-detail-panel__actions snapshot-detail-actions">
                  <button
                    type="button"
                    className="snapshot-room-action-btn"
                    disabled={roomActionBusy}
                    onClick={() => openUploadForRoom(selectedPanel.slug)}
                  >
                    {isUploadingSelected ? "Uploading…" : "Add photos"}
                  </button>
                  <button
                    type="button"
                    className="snapshot-room-action-btn"
                    disabled={roomActionBusy}
                    onClick={() => openIssueModal(selectedPanel.slug)}
                  >
                    Add issue
                  </button>
                </div>
              </header>

              <div className="dashboard-detail-panel__meta">
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Photos
                  </span>
                  <span>{selectedPanel.images.length}</span>
                </div>
                <div className="dashboard-detail-panel__meta-item">
                  <span className="dashboard-detail-panel__meta-label">
                    Issues
                  </span>
                  <span>{selectedIssues.length}</span>
                </div>
              </div>

              <section
                className="dashboard-detail-panel__section"
                aria-labelledby="snapshot-detail-photos-heading"
              >
                <h3
                  id="snapshot-detail-photos-heading"
                  className="dashboard-detail-panel__section-title"
                >
                  Photos
                </h3>
                {selectedPanel.images.length === 0 ? (
                  <p className="snapshot-empty">No photos for this room yet.</p>
                ) : (
                  <ul className="snapshot-detail-photo-grid">
                    {selectedPanel.images.map((image) => (
                      <li
                        key={image.snapshotImage.id}
                        className="snapshot-detail-photo"
                      >
                        <SnapshotThumb
                          src={image.previewUrl}
                          alt={image.fileName}
                          className="snapshot-detail-photo-img"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="dashboard-detail-panel__section"
                aria-labelledby="snapshot-detail-issues-heading"
              >
                <h3
                  id="snapshot-detail-issues-heading"
                  className="dashboard-detail-panel__section-title"
                >
                  Issues
                </h3>
                <p
                  className="dashboard-subtitle"
                  style={{ margin: "0 0 12px", fontSize: 13 }}
                >
                  Snapshot notes only — not maintenance tickets.
                </p>
                {selectedIssues.length === 0 ? (
                  <p className="snapshot-empty">
                    No issues recorded for this room.
                  </p>
                ) : (
                  <ul className="snapshot-issues">
                    {selectedIssues.map((issue) => {
                      const meta = formatIssueSeverityMeta(issue);
                      return (
                        <li key={issue.id} className="snapshot-issue">
                          <p className="snapshot-issue-label">{issue.label}</p>
                          {meta ? (
                            <p className="snapshot-issue-meta">{meta}</p>
                          ) : null}
                          {issue.notes ? (
                            <p className="snapshot-issue-notes">
                              {issue.notes}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </aside>
      </div>

      {addRoomModalOpen ? (
        <div
          className="snapshot-issue-modal-backdrop"
          role="presentation"
          onClick={closeAddRoomModal}
        >
          <div
            className="snapshot-issue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-add-room-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="snapshot-add-room-modal-title"
              className="snapshot-issue-modal-title"
            >
              Add room
            </h2>
            <p className="snapshot-issue-modal-subtitle">
              Adds a room card to this snapshot. Photos and issues you add will
              be saved under this room name.
            </p>

            <form
              className="snapshot-issue-modal-form"
              onSubmit={handleAddRoomSubmit}
            >
              <div className="snapshot-field">
                <label htmlFor="snapshot-new-room-label">
                  Room name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="snapshot-new-room-label"
                  type="text"
                  value={newRoomLabel}
                  onChange={(event) => setNewRoomLabel(event.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Office, Garage"
                />
              </div>

              {error ? (
                <DashboardAlert message={error} />
              ) : null}

              <div className="snapshot-issue-modal-actions">
                <button
                  type="button"
                  className="snapshot-issue-modal-btn-secondary"
                  onClick={closeAddRoomModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dashboard-btn-primary"
                  style={{ marginTop: 0 }}
                  disabled={!newRoomLabel.trim()}
                >
                  Add room
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {issueModalOpen ? (
        <div
          className="snapshot-issue-modal-backdrop"
          role="presentation"
          onClick={closeIssueModal}
        >
          <div
            className="snapshot-issue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-issue-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="snapshot-issue-modal-title"
              className="snapshot-issue-modal-title"
            >
              Add issue — {issueModalRoomLabel}
            </h2>
            <p className="snapshot-issue-modal-subtitle">
              Recorded for this room on this snapshot only — not a maintenance
              ticket.
            </p>

            <form
              className="snapshot-issue-modal-form"
              onSubmit={(event) => void handleAddIssueSubmit(event)}
            >
              <div className="snapshot-field">
                <label htmlFor="snapshot-issue-label">
                  Label <span aria-hidden="true">*</span>
                </label>
                <input
                  id="snapshot-issue-label"
                  type="text"
                  value={issueLabel}
                  onChange={(event) => setIssueLabel(event.target.value)}
                  disabled={savingIssue}
                  required
                  autoFocus
                  placeholder="e.g. Scuff on baseboard"
                />
              </div>

              <div className="snapshot-field">
                <label htmlFor="snapshot-issue-severity">
                  Severity (optional)
                </label>
                <select
                  id="snapshot-issue-severity"
                  value={issueSeverity}
                  onChange={(event) =>
                    setIssueSeverity(
                      event.target.value as "" | SnapshotSeverity
                    )
                  }
                  disabled={savingIssue}
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="snapshot-field">
                <label htmlFor="snapshot-issue-notes">Notes (optional)</label>
                <textarea
                  id="snapshot-issue-notes"
                  value={issueNotes}
                  onChange={(event) => setIssueNotes(event.target.value)}
                  disabled={savingIssue}
                  placeholder="Additional detail"
                />
              </div>

              {error ? (
                <DashboardAlert message={error} />
              ) : null}

              <div className="snapshot-issue-modal-actions">
                <button
                  type="button"
                  className="snapshot-issue-modal-btn-secondary"
                  onClick={closeIssueModal}
                  disabled={savingIssue}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dashboard-btn-primary"
                  style={{ marginTop: 0 }}
                  disabled={savingIssue || !issueLabel.trim()}
                >
                  {savingIssue ? "Saving…" : "Save issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
