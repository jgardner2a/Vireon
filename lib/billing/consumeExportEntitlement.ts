import type { ExportEntitlementSource } from "@/lib/billing/types";
import { supabase } from "@/lib/supabaseClient";

export type ConsumeExportEntitlementResult =
  | { ok: true }
  | { ok: false; message: string };

export async function consumeExportEntitlement(
  source: ExportEntitlementSource
): Promise<ConsumeExportEntitlementResult> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return { ok: false, message: "Sign in to export your evidence package." };
  }

  const response = await fetch("/api/billing/consume-export", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    message?: string;
  };

  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      message: payload.message || "Could not apply export entitlement.",
    };
  }

  return { ok: true };
}
