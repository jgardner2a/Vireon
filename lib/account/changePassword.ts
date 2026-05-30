import type { AuthError } from "@supabase/supabase-js";

import { fetchAuthSession, getAuthEmail } from "@/lib/authSession";
import { PASSWORD_MIN_LENGTH } from "@/lib/authValidation";
import { supabase } from "@/lib/supabaseClient";

export type ChangePasswordField =
  | "currentPassword"
  | "newPassword"
  | "confirmPassword";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string; field?: ChangePasswordField };

function messageFromAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("same as the old password")) {
    return "New password must be different from your current password.";
  }
  if (msg.includes("password")) {
    return error.message;
  }

  return error.message || "Could not update your password. Try again.";
}

function validateChangePasswordInput(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): ChangePasswordResult | { ok: true; newPassword: string } {
  if (!currentPassword.trim()) {
    return {
      ok: false,
      message: "Current password is required.",
      field: "currentPassword",
    };
  }

  if (!newPassword) {
    return {
      ok: false,
      message: "New password is required.",
      field: "newPassword",
    };
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      field: "newPassword",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message: "Passwords do not match.",
      field: "confirmPassword",
    };
  }

  if (currentPassword === newPassword) {
    return {
      ok: false,
      message: "New password must be different from your current password.",
      field: "newPassword",
    };
  }

  return { ok: true, newPassword };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ChangePasswordResult> {
  const email = getAuthEmail();
  if (!email) {
    return { ok: false, message: "Sign in to change your password." };
  }

  const validation = validateChangePasswordInput(
    currentPassword,
    newPassword,
    confirmPassword
  );
  if (!validation.ok) {
    return validation;
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      ok: false,
      message: "Current password is incorrect.",
      field: "currentPassword",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: validation.newPassword,
  });

  if (updateError) {
    return {
      ok: false,
      message: messageFromAuthError(updateError),
      field: "newPassword",
    };
  }

  await fetchAuthSession();
  return { ok: true };
}
