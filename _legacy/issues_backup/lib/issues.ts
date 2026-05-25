// LEGACY ISSUES MODULE - REPLACED BY lib/maintenance/maintenanceLogs.ts
// Supabase table: public.issues (deprecated; use maintenance_logs)

import { buildIssueTitle } from "./issueConfig";
import type { CreateIssueInput, Issue } from "./types";
import { supabase } from "@/lib/supabaseClient";

type IssueRow = {
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

function mapIssueRow(row: IssueRow): Issue {
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

export async function fetchIssuesForHome(
  userId: string,
  homeId: string
): Promise<{ ok: true; issues: Issue[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[issues] fetch", error);
    return {
      ok: false,
      message: error.message || "Could not load issues.",
    };
  }

  return {
    ok: true,
    issues: (data ?? []).map((row) => mapIssueRow(row as IssueRow)),
  };
}

export async function createIssue(
  input: CreateIssueInput
): Promise<{ ok: true; issue: Issue } | { ok: false; message: string }> {
  const description = input.description.trim();

  if (!description) {
    return { ok: false, message: "Please add a description." };
  }

  const title = buildIssueTitle(input.category, input.issueType);

  const { data, error } = await supabase
    .from("issues")
    .insert({
      user_id: input.userId,
      home_id: input.homeId,
      category: input.category,
      issue_type: input.issueType,
      title,
      description,
      status: input.status,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[issues] insert", error);
    return {
      ok: false,
      message: error?.message || "Could not log issue.",
    };
  }

  return { ok: true, issue: mapIssueRow(data as IssueRow) };
}
