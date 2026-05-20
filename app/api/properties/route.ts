import { NextResponse } from "next/server";
import { canCreateProperty } from "@/lib/permissions";
import { getSubscriptionPlan, isPro } from "@/lib/subscription/subscription";
import { resolveProfileIdByEmail } from "@/lib/export/supabaseRead";
import {
  countPropertiesForProfileServer,
  createServerSupabase,
  insertPropertyForProfileServer,
} from "@/lib/server/propertyResidence";

/** Server tier + residence status — client is not authoritative. */

export const runtime = "nodejs";

type CreatePropertyBody = {
  email?: string;
  name?: string;
  address?: string;
};

export async function POST(request: Request) {
  let body: CreatePropertyBody;
  try {
    body = (await request.json()) as CreatePropertyBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (!email || !name || !address) {
    return NextResponse.json(
      { error: "invalid_input", message: "email, name, and address are required." },
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

  const supabase = createServerSupabase();
  const propertyCount = await countPropertiesForProfileServer(supabase, profileId);
  if (propertyCount === null) {
    return NextResponse.json(
      { error: "persist_failed", message: "Could not load account." },
      { status: 500 }
    );
  }

  let plan: Awaited<ReturnType<typeof getSubscriptionPlan>>;
  try {
    plan = await getSubscriptionPlan(profileId);
  } catch {
    return NextResponse.json(
      {
        error: "persist_failed",
        message: "Could not load subscription plan.",
      },
      { status: 500 }
    );
  }

  if (!canCreateProperty(plan, propertyCount)) {
    return NextResponse.json(
      {
        error: "property_limit_reached",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const row = await insertPropertyForProfileServer(
    supabase,
    profileId,
    { name, address },
    { isPro: isPro(plan), existingCount: propertyCount }
  );

  if (!row) {
    return NextResponse.json(
      { error: "persist_failed", message: "Could not save the property." },
      { status: 500 }
    );
  }

  const propertiesCount = await countPropertiesForProfileServer(supabase, profileId);

  if (propertiesCount !== null) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ properties_count: propertiesCount })
      .eq("id", profileId);

    if (profileError) {
      console.error("[api/properties] update properties_count", profileError);
    }
  }

  return NextResponse.json({
    property: {
      id: row.id,
      name: row.name,
      address: row.address,
      residenceStatus: row.residence_status,
    },
    propertiesCount: propertiesCount ?? propertyCount + 1,
  });
}
