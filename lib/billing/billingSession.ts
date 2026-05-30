import { supabase } from "@/lib/supabaseClient";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Waits for Supabase Auth session before billing table reads/writes. */
export async function getBillingSessionUserId(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  const userId = session.user?.id?.trim() ?? "";
  return userId || null;
}

/** Retry briefly on cold refresh while auth hydrates from storage. */
export async function waitForBillingSessionUserId(
  maxAttempts = 6
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const userId = await getBillingSessionUserId();
    if (userId) {
      return userId;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(50 * (attempt + 1));
    }
  }

  return null;
}
