import { supabase } from "@/lib/supabaseClient";

export type RequestAccountDeletionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function requestAccountDeletion(
  password: string,
  confirmation: string
): Promise<RequestAccountDeletionResult> {
  const trimmedConfirmation = confirmation.trim();
  if (trimmedConfirmation !== "DELETE") {
    return { ok: false, message: 'Type DELETE to confirm account deletion.' };
  }

  if (!password) {
    return { ok: false, message: "Current password is required." };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[account] get session", sessionError);
    return {
      ok: false,
      message: sessionError.message || "Could not verify your session.",
    };
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    return { ok: false, message: "Sign in to delete your account." };
  }

  let response: Response;
  try {
    response = await fetch("/api/account/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        password,
        confirmation: trimmedConfirmation,
      }),
    });
  } catch (error) {
    console.error("[account] delete request", error);
    return {
      ok: false,
      message: "Could not reach the server. Try again in a moment.",
    };
  }

  let payload: { ok?: boolean; message?: string } | null = null;
  try {
    payload = (await response.json()) as { ok?: boolean; message?: string };
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      message:
        payload?.message ||
        (response.status === 401
          ? "Incorrect password or session expired."
          : "Could not delete your account. Try again."),
    };
  }

  return { ok: true };
}
