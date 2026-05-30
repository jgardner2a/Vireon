import { getAuthEmail } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";

export type AccountProfile = {
  email: string;
  createdAt: string | null;
  emailVerified: boolean;
};

export type AccountProfileResult =
  | { ok: true; profile: AccountProfile }
  | { ok: false; message: string };

export async function fetchAccountProfile(): Promise<AccountProfileResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[account] fetch profile", error);
    return {
      ok: false,
      message: error.message || "Could not load account details.",
    };
  }

  if (!user?.id) {
    return { ok: false, message: "Sign in to view account details." };
  }

  return {
    ok: true,
    profile: {
      email: user.email?.trim() ?? "",
      createdAt: user.created_at ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
    },
  };
}

export type ResendVerificationResult =
  | { ok: true }
  | { ok: false; message: string };

export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  const email = getAuthEmail();
  if (!email) {
    return { ok: false, message: "Sign in to resend verification email." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    console.error("[account] resend verification", error);
    return {
      ok: false,
      message: error.message || "Could not send verification email.",
    };
  }

  return { ok: true };
}
