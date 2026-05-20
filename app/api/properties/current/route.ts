import { NextResponse } from "next/server";
import { isPro } from "@/lib/subscription/subscription";
import { getSubscriptionPlan } from "@/lib/subscription/subscription";
import { resolveProfileIdByEmail } from "@/lib/export/supabaseRead";
import {
  createServerSupabase,
  setCurrentPropertyForProfileServer,
} from "@/lib/server/propertyResidence";

/** Promotes one property to CURRENT and demotes the prior CURRENT to PREVIOUS. */

export const runtime = "nodejs";

type SetCurrentPropertyBody = {
  email?: string;
  propertyId?: string;
};

export async function POST(request: Request) {
  let body: SetCurrentPropertyBody;
  try {
    body = (await request.json()) as SetCurrentPropertyBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const propertyId =
    typeof body.propertyId === "string" ? body.propertyId.trim() : "";

  if (!email || !propertyId) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "email and propertyId are required.",
      },
      { status: 400 }
    );
  }

  const profileId = await resolveProfileIdByEmail(email);
  if (!profileId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Account not found." },
      { status: 401 }
    );
  }

  let plan: Awaited<ReturnType<typeof getSubscriptionPlan>>;
  try {
    plan = await getSubscriptionPlan(profileId);
  } catch {
    return NextResponse.json(
      { error: "persist_failed", message: "Could not load subscription plan." },
      { status: 500 }
    );
  }

  if (!isPro(plan)) {
    return NextResponse.json(
      {
        error: "upgrade_required",
        message: "Free accounts have one current home. Upgrade to Pro to switch properties.",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const supabase = createServerSupabase();
  const result = await setCurrentPropertyForProfileServer(
    supabase,
    profileId,
    propertyId
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: "persist_failed", message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    property: {
      id: result.property.id,
      name: result.property.name,
      address: result.property.address,
      residenceStatus: result.property.residence_status,
    },
  });
}
