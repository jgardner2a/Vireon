/**
 * Browser trigger for Export API.
 * Sends scope + email only — tier is resolved server-side in app/api/export/route.ts.
 */

import { getAuthEmail } from "../authSession";
import { hasFullVaultAccess } from "@/lib/permissions";
import {
  PROPERTY_RESIDENCE_CURRENT,
  type PropertyResidenceStatus,
} from "@/lib/property/residenceStatus";
import type { UserPlan } from "@/lib/subscription/subscription";
import type { ExportScope } from "./types";

type ExportPropertyRef = {
  id: string;
  residenceStatus?: PropertyResidenceStatus;
};

function currentPropertyId(properties: ExportPropertyRef[]): string | null {
  const current = properties.find(
    (p) => p.residenceStatus === PROPERTY_RESIDENCE_CURRENT
  );
  return current?.id ?? properties[0]?.id ?? null;
}

/** Client export scope from STL-resolved plan (permissions evaluation). */
export function resolveVaultExportScope(
  plan: UserPlan,
  filterPropertyId: string,
  properties: ExportPropertyRef[]
): ExportScope | null {
  if (filterPropertyId !== "all") {
    return { kind: "property", propertyId: filterPropertyId };
  }
  if (hasFullVaultAccess(plan)) {
    return { kind: "all_properties" };
  }
  const id = currentPropertyId(properties);
  if (!id) return null;
  return { kind: "property", propertyId: id };
}

export type TriggerExportOptions = {
  scope: ExportScope;
};

export type TriggerExportResult =
  | { ok: true; filename: string; profile: string | null }
  | { ok: false; code: string; message: string; upgradeRequired?: boolean };

export async function triggerExportDownload(
  options: TriggerExportOptions
): Promise<TriggerExportResult> {
  const email = getAuthEmail();

  if (!email) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "Sign in to export evidence.",
    };
  }

  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      scope: options.scope,
    }),
  });

  if (!response.ok) {
    let payload: { message?: string; code?: string; upgradeRequired?: boolean } =
      {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // ignore
    }
    return {
      ok: false,
      code: payload.code ?? "EXPORT_FAILED",
      message: payload.message ?? "Export failed.",
      upgradeRequired: payload.upgradeRequired,
    };
  }

  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename =
    filenameMatch?.[1] ?? `vireon-evidence-export-${Date.now()}.zip`;
  const profile = response.headers.get("X-Vireon-Export-Profile");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  return { ok: true, filename, profile };
}

/** UI-only: request full export to surface server-side upgrade rejection. */
export async function requestFullExportUpgradeCheck(
  scope: ExportScope
): Promise<TriggerExportResult> {
  const email = getAuthEmail();
  if (!email) {
    return {
      ok: false,
      code: "NOT_AUTHENTICATED",
      message: "Sign in to export evidence.",
    };
  }

  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      scope,
      requestedFull: true,
    }),
  });

  if (response.ok) {
    return { ok: true, filename: "", profile: "FULL_PACKAGE" };
  }

  let payload: { message?: string; code?: string; upgradeRequired?: boolean } =
    {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // ignore
  }

  return {
    ok: false,
    code: payload.code ?? "PROFILE_NOT_ALLOWED",
    message: payload.message ?? "Full export requires Pro.",
    upgradeRequired: true,
  };
}
