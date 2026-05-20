"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMoveChecklistMeta,
  loadMoveChecklist,
  saveMoveChecklist,
  type MoveChecklistKind,
  type MoveChecklistState,
} from "@/lib/moveChecklist";

type MoveChecklistViewProps = {
  kind: MoveChecklistKind;
};

export function MoveChecklistView({ kind }: MoveChecklistViewProps) {
  const meta = getMoveChecklistMeta(kind);
  const [state, setState] = useState<MoveChecklistState | null>(null);

  useEffect(() => {
    setState(loadMoveChecklist(kind));
  }, [kind]);

  const persist = useCallback(
    (next: MoveChecklistState) => {
      setState(next);
      saveMoveChecklist(kind, next);
    },
    [kind]
  );

  const toggleItem = (id: string) => {
    if (!state) return;
    persist({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    });
  };

  const resetChecklist = () => {
    const fresh = loadMoveChecklist(kind);
    const cleared: MoveChecklistState = {
      items: fresh.items.map((item) => ({ ...item, checked: false })),
      notes: "",
    };
    persist(cleared);
  };

  if (!state) {
    return (
      <div className="my-home-card my-home-card--flat">
        <p className="my-home-text-muted">Loading checklist…</p>
      </div>
    );
  }

  const completedCount = state.items.filter((item) => item.checked).length;
  const totalCount = state.items.length;

  return (
    <>
      <header className="my-home-page-header">
        <div>
          <h1 className="my-home-title">{meta.title}</h1>
          <p className="my-home-subtitle">{meta.description}</p>
        </div>
      </header>

      <p className="my-home-checklist-utility-note" role="note">
        Personal utility only — not connected to Gallery, Evidence, or Vault.
      </p>

      <section className="my-home-card my-home-checklist-card">
        <div className="my-home-checklist-card__head">
          <div>
            <h2 className="my-home-card-title" style={{ marginBottom: 4 }}>
              Tasks
            </h2>
            <p className="my-home-text-muted">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <button
            type="button"
            className="my-home-btn-ghost my-home-checklist-reset"
            onClick={resetChecklist}
          >
            Reset list
          </button>
        </div>

        <ul className="my-home-checklist-list">
          {state.items.map((item) => (
            <li key={item.id}>
              <label className="my-home-checklist-item">
                <input
                  type="checkbox"
                  className="my-home-checklist-item__input"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                />
                <span
                  className={
                    item.checked
                      ? "my-home-checklist-item__label my-home-checklist-item__label--done"
                      : "my-home-checklist-item__label"
                  }
                >
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="my-home-card my-home-checklist-card" style={{ marginTop: 16 }}>
        <h2 className="my-home-card-title">Notes</h2>
        <p className="my-home-text-muted" style={{ marginTop: 4, marginBottom: 12 }}>
          Optional reminders for yourself — stored locally in this browser only.
        </p>
        <div className="my-home-field">
          <label className="my-home-label" htmlFor={`${kind}-notes`}>
            Personal notes
          </label>
          <textarea
            id={`${kind}-notes`}
            className="my-home-textarea"
            value={state.notes}
            onChange={(e) => persist({ ...state, notes: e.target.value })}
            placeholder="Add any extra tasks or reminders…"
            rows={5}
          />
        </div>
      </section>
    </>
  );
}
