import { NextResponse } from "next/server";
import { runExport } from "@/lib/export/engine";
import { resolveProfileIdByEmail } from "@/lib/export/supabaseRead";
import {
  getSubscriptionPlan,
  isPro,
  type UserPlan,
} from "@/lib/subscription/subscription";
import type { ExportProfile, ExportScope } from "@/lib/export/types";

/** Server tier: STL only — never read `profiles.plan` outside getSubscriptionPlan. */

export const runtime = "nodejs";

type ExportBody = {
  email?: string;
  scope?: ExportScope;
  /** Ignored for tier selection — kept only to detect bypass attempts. */
  profile?: ExportProfile;
  requestedFull?: boolean;
};

function isExportScope(value: unknown): value is ExportScope {
  if (!value || typeof value !== "object") return false;
  const scope = value as Record<string, unknown>;
  if (scope.kind === "all_properties") return true;
  if (
    scope.kind === "property" &&
    typeof scope.propertyId === "string" &&
    scope.propertyId.trim()
  ) {
    return true;
  }
  if (
    scope.kind === "issue" &&
    typeof scope.issueId === "string" &&
    typeof scope.propertyId === "string"
  ) {
    return true;
  }
  return false;
}

/**
 * SINGLE SOURCE OF TRUTH for export tier.
 * Client/UI cannot select BASIC vs FULL — only subscription plan decides.
 */
function resolveExportProfileFromPlan(
  plan: Awaited<ReturnType<typeof getSubscriptionPlan>>
): ExportProfile {
  return isPro(plan) ? "FULL_PACKAGE" : "BASIC_SNAPSHOT";
}

export async function POST(request: Request) {
  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !isExportScope(body.scope)) {
    return NextResponse.json(
      {
        code: "INVALID_INPUT",
        message: "email and a valid scope are required.",
      },
      { status: 400 }
    );
  }

  const profileId = await resolveProfileIdByEmail(email);
  if (!profileId) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Account not found." },
      { status: 401 }
    );
  }

  let plan: UserPlan;
  try {
    plan = await getSubscriptionPlan(profileId);
  } catch {
    return NextResponse.json(
      {
        code: "PERSIST_FAILED",
        message: "Could not load subscription plan.",
      },
      { status: 500 }
    );
  }

  const exportProfile = resolveExportProfileFromPlan(plan);

  if (body.requestedFull === true || body.profile === "FULL_PACKAGE") {
    if (!isPro(plan)) {
      return NextResponse.json(
        {
          code: "PROFILE_NOT_ALLOWED",
          message: "Full evidence packages require Pro.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }
  }

  const result = await runExport({
    email,
    profileId,
    scope: body.scope,
    profile: exportProfile,
  });

  if (!result.ok) {
    const status =
      result.code === "UNAUTHORIZED"
        ? 401
        : result.code === "SCOPE_NOT_ALLOWED" ||
            result.code === "PROFILE_NOT_ALLOWED"
          ? 403
          : 400;
    return NextResponse.json(
      {
        code: result.code,
        message: result.message,
        upgradeRequired:
          result.code === "PROFILE_NOT_ALLOWED" ||
          result.code === "SCOPE_NOT_ALLOWED",
      },
      { status }
    );
  }

  const file = result.package.files[0];
  const bytes =
    typeof file.content === "string"
      ? new TextEncoder().encode(file.content)
      : file.content;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.package.filename}"`,
      "Cache-Control": "no-store",
      "X-Vireon-Export-Profile": result.package.profile,
    },
  });
}
