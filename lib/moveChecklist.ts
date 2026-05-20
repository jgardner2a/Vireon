/**
 * Personal move-in / move-out checklist state (browser localStorage only).
 *
 * NOT part of Evidence, Vault, Gallery, Export, or any renter documentation system.
 * Do not import this module from evidence/, gallery/, or vault/ code.
 */

export type MoveChecklistKind = "move-in" | "move-out";

export type MoveChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type MoveChecklistState = {
  items: MoveChecklistItem[];
  notes: string;
};

const STORAGE_PREFIX = "vireon-personal-checklist:";

const DEFAULT_LABELS: Record<MoveChecklistKind, readonly string[]> = {
  "move-in": [
    "Check all lights work",
    "Check appliances function",
    "Inspect walls for damage",
    "Inspect floors for damage",
    "Check plumbing",
    "Test doors and locks",
    "Document existing condition (personal use only)",
  ],
  "move-out": [
    "Clean all rooms",
    "Remove belongings",
    "Repair minor damage",
    "Clean appliances",
    "Take final condition photos (personal use only)",
    "Return keys",
  ],
};

function storageKey(kind: MoveChecklistKind): string {
  return `${STORAGE_PREFIX}${kind}`;
}

function slugId(kind: MoveChecklistKind, label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${kind}-${index}-${base || "item"}`;
}

export function createDefaultChecklistState(
  kind: MoveChecklistKind
): MoveChecklistState {
  return {
    items: DEFAULT_LABELS[kind].map((label, index) => ({
      id: slugId(kind, label, index),
      label,
      checked: false,
    })),
    notes: "",
  };
}

function mergeWithDefaults(
  kind: MoveChecklistKind,
  saved: Partial<MoveChecklistState> | null
): MoveChecklistState {
  const defaults = createDefaultChecklistState(kind);
  if (!saved?.items?.length) {
    return {
      items: defaults.items,
      notes: typeof saved?.notes === "string" ? saved.notes : "",
    };
  }

  const savedById = new Map(
    saved.items
      .filter((item) => item && typeof item.id === "string")
      .map((item) => [item.id, Boolean(item.checked)])
  );

  const items = defaults.items.map((item) => ({
    ...item,
    checked: savedById.get(item.id) ?? false,
  }));

  return {
    items,
    notes: typeof saved.notes === "string" ? saved.notes : "",
  };
}

export function loadMoveChecklist(kind: MoveChecklistKind): MoveChecklistState {
  if (typeof window === "undefined") {
    return createDefaultChecklistState(kind);
  }

  try {
    const raw = localStorage.getItem(storageKey(kind));
    if (!raw) return createDefaultChecklistState(kind);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return createDefaultChecklistState(kind);
    }
    return mergeWithDefaults(kind, parsed as Partial<MoveChecklistState>);
  } catch {
    return createDefaultChecklistState(kind);
  }
}

export function saveMoveChecklist(
  kind: MoveChecklistKind,
  state: MoveChecklistState
): void {
  if (typeof window === "undefined") return;

  const payload: MoveChecklistState = {
    items: state.items.map((item) => ({
      id: item.id,
      label: item.label,
      checked: item.checked,
    })),
    notes: state.notes,
  };

  localStorage.setItem(storageKey(kind), JSON.stringify(payload));
}

export function getMoveChecklistMeta(kind: MoveChecklistKind): {
  title: string;
  description: string;
} {
  if (kind === "move-in") {
    return {
      title: "Move-In Checklist",
      description:
        "Personal reminders for settling into a new place. This list is private to your browser and is not part of your rental documentation.",
    };
  }

  return {
    title: "Move-Out Checklist",
    description:
      "Personal reminders before you leave. This list stays on your device only and is not linked to evidence or export tools.",
  };
}
