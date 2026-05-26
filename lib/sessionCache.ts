import { getAuthUserId } from "@/lib/authSession";
import { clearGallerySelectionStorage } from "@/lib/gallery/useGallerySelection";
import { getActiveHomeId } from "@/lib/home/getActiveHomeId";
import { supabase } from "@/lib/supabaseClient";

const USER_ID_KEY = "vireon_user_id";
const HOME_ID_KEY = "vireon_current_home_id";

let cachedUserId: string | null = null;
let cachedCurrentHomeId: string | null = null;

function readSessionStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // quota / private mode
  }
}

function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Cached user id for data layer only.
 * Memory → sessionStorage → auth session mirror → supabase.auth.getUser() (sole getUser call site).
 */
export async function getCachedUserId(): Promise<string | null> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const stored = readSessionStorage(USER_ID_KEY);
  if (stored) {
    cachedUserId = stored;
    return cachedUserId;
  }

  const mirroredUserId = getAuthUserId();
  if (mirroredUserId) {
    cachedUserId = mirroredUserId;
    writeSessionStorage(USER_ID_KEY, cachedUserId);
    return cachedUserId;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    cachedUserId = null;
    removeSessionStorage(USER_ID_KEY);
    return null;
  }

  cachedUserId = user.id;
  writeSessionStorage(USER_ID_KEY, cachedUserId);
  return cachedUserId;
}

/** Memory → sessionStorage → getActiveHomeId(userId) */
export async function getCachedCurrentHomeId(
  userId: string
): Promise<string | null> {
  if (cachedCurrentHomeId) {
    return cachedCurrentHomeId;
  }

  const stored = readSessionStorage(HOME_ID_KEY);
  if (stored) {
    cachedCurrentHomeId = stored;
    return cachedCurrentHomeId;
  }

  const homeId = await getActiveHomeId(userId);
  cachedCurrentHomeId = homeId;

  if (homeId) {
    writeSessionStorage(HOME_ID_KEY, homeId);
  } else {
    removeSessionStorage(HOME_ID_KEY);
  }

  return homeId;
}

/** Clear active-home cache after createHome / setCurrentHome. User id cache is kept. */
export function invalidateHomeCache(): void {
  cachedCurrentHomeId = null;
  removeSessionStorage(HOME_ID_KEY);
}

/** Full reset on logout — memory and sessionStorage identity/home caches. */
export function clearSessionCache(): void {
  cachedUserId = null;
  cachedCurrentHomeId = null;
  removeSessionStorage(USER_ID_KEY);
  removeSessionStorage(HOME_ID_KEY);
  clearGallerySelectionStorage();
}
