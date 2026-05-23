/**
 * profiles table — metadata only. Never used for auth, tenant id, or session checks.
 */
import { supabase } from "./supabaseClient";

/**
 * INSERT missing metadata row after Supabase Auth success.
 * Failures are logged only — never affect login/signup outcome.
 */
async function ensureProfileRow(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id) return;

  const { error } = await supabase.from("profiles").insert({ id });
  if (!error || error.code === "23505") return;
  console.error("[profileMetadata] ensureProfileRow", error);
}

/** Fire-and-forget metadata bootstrap after auth (not part of auth validation). */
export function bootstrapProfileMetadataAfterAuth(userId: string): void {
  void ensureProfileRow(userId);
}
