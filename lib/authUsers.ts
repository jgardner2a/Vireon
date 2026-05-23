import type { AuthError } from "@supabase/supabase-js";
import { fetchAuthSession } from "./authSession";
import { validateAuthCredentials } from "./authValidation";
import { bootstrapProfileMetadataAfterAuth } from "./profileMetadata";
import { supabase } from "./supabaseClient";

function messageFromAuthError(error: AuthError): string {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();

  if (code === "user_already_exists" || msg.includes("already registered")) {
    return "An account with this email already exists. Log in instead.";
  }
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials")
  ) {
    return "Incorrect email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }
  if (msg.includes("password")) {
    return error.message;
  }

  return error.message || "Authentication failed. Try again.";
}

/** Metadata bootstrap only — must not gate auth success/failure. */
async function ensureSubscriptionRow(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.user_id) return;

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan: "free",
  });

  if (error) {
    console.error("[auth] ensureSubscriptionRow", error);
  }
}

async function syncSessionToCache(): Promise<void> {
  await fetchAuthSession();
}

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

export async function signUpUser(
  email: string,
  password: string,
  confirmPassword: string
): Promise<AuthResult> {
  const validation = validateAuthCredentials(email, password, {
    requireConfirm: true,
    confirmPassword,
  });

  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  const { data, error } = await supabase.auth.signUp({
    email: validation.email,
    password: validation.password,
  });

  if (error) {
    return { ok: false, message: messageFromAuthError(error) };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Could not create your account. Try again in a moment.",
    };
  }

  await syncSessionToCache();

  bootstrapProfileMetadataAfterAuth(userId);
  void ensureSubscriptionRow(userId);

  return { ok: true, email: validation.email };
}

export async function signInUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const validation = validateAuthCredentials(email, password);

  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.email,
    password: validation.password,
  });

  if (error) {
    return { ok: false, message: messageFromAuthError(error) };
  }

  const userId = data.user?.id ?? data.session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Could not sign in. Try again in a moment.",
    };
  }

  await syncSessionToCache();

  bootstrapProfileMetadataAfterAuth(userId);
  void ensureSubscriptionRow(userId);

  return { ok: true, email: validation.email };
}
