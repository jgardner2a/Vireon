import { NextResponse } from "next/server";
import { canCreateIssue } from "@/lib/permissions";
import { getSubscriptionPlan } from "@/lib/subscription/subscription";
import { resolveProfileIdByEmail } from "@/lib/export/supabaseRead";
import { countIssuesForProperty } from "@/lib/data/propertyResourceCount";
import {
  createServerSupabase,
  getPropertyForProfileServer,
} from "@/lib/server/propertyResidence";

export const runtime = "nodejs";

type CreateIssueBody = {
  email?: string;
  propertyId?: string;
  title?: string;
  description?: string;
  status?: string;
};

export async function POST(request: Request) {
  let body: CreateIssueBody;
  try {
    body = (await request.json()) as CreateIssueBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const propertyId =
    typeof body.propertyId === "string" ? body.propertyId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const status =
    typeof body.status === "string" && body.status.trim()
      ? body.status.trim()
      : "Open";

  if (!email || !propertyId || !title || !description) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: "email, propertyId, title, and description are required.",
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

  const supabase = createServerSupabase();
  const property = await getPropertyForProfileServer(
    supabase,
    profileId,
    propertyId
  );
  if (!property) {
    return NextResponse.json(
      { error: "property_not_found", message: "Property not found." },
      { status: 404 }
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

  const issueCount = await countIssuesForProperty(profileId, propertyId);
  if (issueCount === null) {
    return NextResponse.json(
      { error: "persist_failed", message: "Could not verify issue limits." },
      { status: 500 }
    );
  }

  if (!canCreateIssue(plan, issueCount)) {
    return NextResponse.json(
      {
        error: "issue_limit_reached",
        message: "Free accounts can log up to 4 issues per property.",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("issues")
    .insert({
      profile_id: profileId,
      property_id: propertyId,
      title,
      description,
      status,
    })
    .select("id, property_id, title, description, status, created_at")
    .single();

  if (error || !data) {
    console.error("[api/issues] insert", error);
    return NextResponse.json(
      { error: "persist_failed", message: "Could not save the issue." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    issue: {
      id: data.id,
      propertyId: data.property_id,
      title: data.title,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}
