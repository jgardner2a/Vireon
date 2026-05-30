import { cleanupAttachmentsAfterLogDelete } from "@/lib/attachments/logDeleteAttachmentCleanup";
import { buildComplexIssueTitle } from "@/lib/complex/logConfig";
import { assertCanCreateEvidenceLog } from "@/lib/billing/planEnforcement";
import type {
  ComplexIssue,
  CreateComplexIssueInput,
  UpdateComplexIssueInput,
} from "@/lib/complex/types";
import { supabase } from "@/lib/supabaseClient";

type ComplexIssueRow = {
  id: string;
  user_id: string;
  home_id: string;
  category: string;
  issue_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

function mapRow(row: ComplexIssueRow): ComplexIssue {
  return {
    id: row.id,
    user_id: row.user_id,
    home_id: row.home_id,
    category: row.category,
    issue_type: row.issue_type,
    title: row.title,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function fetchComplexIssuesForHome(
  userId: string,
  homeId: string
): Promise<
  { ok: true; issues: ComplexIssue[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("complex_issues")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[complex] fetch", error);
    return {
      ok: false,
      message: error.message || "Could not load complex issues.",
    };
  }

  return {
    ok: true,
    issues: (data ?? []).map((row) => mapRow(row as ComplexIssueRow)),
  };
}

export async function createComplexIssue(
  input: CreateComplexIssueInput
): Promise<
  { ok: true; issue: ComplexIssue } | { ok: false; message: string }
> {
  const description = input.description.trim();

  if (!description) {
    return { ok: false, message: "Please add a description." };
  }

  const planCheck = await assertCanCreateEvidenceLog(input.userId, input.homeId);
  if (!planCheck.ok) {
    return planCheck;
  }

  const title = buildComplexIssueTitle(input.category, input.issueType);

  const { data, error } = await supabase
    .from("complex_issues")
    .insert({
      user_id: input.userId,
      home_id: input.homeId,
      category: input.category,
      issue_type: input.issueType,
      title,
      description,
      status: input.status || "Active",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[complex] insert", error);
    return {
      ok: false,
      message: error?.message || "Could not log complex issue.",
    };
  }

  return { ok: true, issue: mapRow(data as ComplexIssueRow) };
}

export async function updateComplexIssue(
  input: UpdateComplexIssueInput
): Promise<
  { ok: true; issue: ComplexIssue } | { ok: false; message: string }
> {
  const description = input.description.trim();

  if (!description) {
    return { ok: false, message: "Please add a description." };
  }

  const title = buildComplexIssueTitle(input.category, input.issueType);

  const { data, error } = await supabase
    .from("complex_issues")
    .update({
      category: input.category,
      issue_type: input.issueType,
      title,
      description,
      status: input.status,
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[complex] update", error);
    return {
      ok: false,
      message: error?.message || "Could not update complex issue.",
    };
  }

  return { ok: true, issue: mapRow(data as ComplexIssueRow) };
}

export async function updateComplexIssueStatus(
  issueId: string,
  userId: string,
  status: string
): Promise<
  { ok: true; issue: ComplexIssue } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("complex_issues")
    .update({ status })
    .eq("id", issueId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[complex] update status", error);
    return {
      ok: false,
      message: error?.message || "Could not update status.",
    };
  }

  return { ok: true, issue: mapRow(data as ComplexIssueRow) };
}

export async function deleteComplexIssue(
  issueId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: attachmentRows, error: fetchAttachmentsError } = await supabase
    .from("attachments")
    .select("id, storage_path")
    .eq("owner_type", "complex")
    .eq("owner_id", issueId)
    .eq("user_id", userId);

  if (fetchAttachmentsError) {
    console.error("[complex] delete fetch attachments", fetchAttachmentsError);
  }

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    storage_path: String((row as { storage_path: string }).storage_path ?? ""),
  }));

  const { error } = await supabase
    .from("complex_issues")
    .delete()
    .eq("id", issueId)
    .eq("user_id", userId);

  if (error) {
    console.error("[complex] delete", error);
    return {
      ok: false,
      message: error.message || "Could not delete complex issue.",
    };
  }

  await cleanupAttachmentsAfterLogDelete("complex", attachments, {
    userId,
    ownerType: "complex",
    ownerId: issueId,
  });

  return { ok: true };
}
