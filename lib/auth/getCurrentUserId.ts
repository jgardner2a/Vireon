import { getCachedUserId } from "@/lib/sessionCache";

/** Data-layer user id; delegates to the session cache (single auth.getUser() source). */
export async function getCurrentUserId(): Promise<string | null> {
  return getCachedUserId();
}
