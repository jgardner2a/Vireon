import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resolveExportEligibility } from "@/lib/billing/planEnforcement";
import { getSupabaseAdmin } from "@/lib/supabase/adminClient";
import type { ExportEntitlementSource } from "@/lib/billing/types";
import { isPlanTier } from "@/lib/billing/types";

type ConsumeExportBody = {
  source?: ExportEntitlementSource;
};

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, message: "Sign in to export your evidence package." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Sign in to export your evidence package." },
        { status: 401 }
      );
    }

    const anon = getSupabaseAnon();
    const {
      data: { user },
      error: userError,
    } = await anon.auth.getUser(accessToken);

    if (userError || !user?.id) {
      return NextResponse.json(
        { ok: false, message: "Sign in to export your evidence package." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ConsumeExportBody;
    const source = body.source;
    if (source !== "pro_included" && source !== "purchase") {
      return NextResponse.json(
        { ok: false, message: "Invalid export entitlement source." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("plan, export_credits, pro_included_export_used")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, message: "Could not load your plan." },
        { status: 500 }
      );
    }

    const plan = isPlanTier(profile.plan) ? profile.plan : "free";
    const exportCredits = Math.max(0, Number(profile.export_credits) || 0);
    const proIncludedExportUsed = Boolean(profile.pro_included_export_used);

    const eligibility = resolveExportEligibility({
      plan,
      exportCredits,
      proIncludedExportUsed,
    });

    if (!eligibility.ok || eligibility.source !== source) {
      return NextResponse.json(
        { ok: false, message: eligibility.ok ? "Export entitlement mismatch." : eligibility.message },
        { status: 403 }
      );
    }

    if (source === "pro_included") {
      const { data: consumed, error: consumeError } = await admin.rpc(
        "consume_pro_included_export",
        { p_user_id: user.id }
      );

      if (consumeError) {
        console.error("[billing] consume pro included export", consumeError);
        return NextResponse.json(
          { ok: false, message: "Could not record your included Pro export." },
          { status: 500 }
        );
      }

      if (!consumed) {
        return NextResponse.json(
          { ok: false, message: "No included Pro export available." },
          { status: 403 }
        );
      }
    } else {
      const { data: remainingCredits, error: consumeError } = await admin.rpc(
        "consume_export_credit",
        { p_user_id: user.id }
      );

      if (consumeError) {
        console.error("[billing] consume export credit", consumeError);
        return NextResponse.json(
          { ok: false, message: "Could not use your export credit." },
          { status: 500 }
        );
      }

      if (remainingCredits === null || remainingCredits === undefined) {
        return NextResponse.json(
          { ok: false, message: "No export credits available." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[billing] consume export", error);
    return NextResponse.json(
      { ok: false, message: "Could not apply export entitlement." },
      { status: 500 }
    );
  }
}
