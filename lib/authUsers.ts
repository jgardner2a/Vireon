import type { AuthError } from "@supabase/supabase-js";

import { fetchAuthSession } from "./authSession";
import { validateAuthCredentials } from "./authValidation";
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

  if (!data.user?.id) {
    return {
      ok: false,
      message: "Could not create your account. Try again in a moment.",
    };
  }

  await fetchAuthSession();
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

  await fetchAuthSession();
  return { ok: true, email: validation.email };
}
