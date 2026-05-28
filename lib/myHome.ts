import { invalidateDashboardHomesCache } from "@/lib/dashboard/dashboardContext";
import { getDashboardState } from "@/lib/dashboard/dashboardOrchestrator";
import {
  mapHomeRow,
  type Home,
  type HomeRow,
} from "@/lib/home/homeMapper";
import {
  getCachedUserId,
  invalidateHomeCache,
} from "@/lib/sessionCache";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import { getCachedStorageList } from "@/lib/storageCache";
import { supabase } from "./supabaseClient";

export type { Home } from "@/lib/home/homeMapper";

async function listAllStorageObjects(
  userId: string,
  homeId: string
): Promise<{ data: { name: string }[] | null; error: Error | null }> {
  const prefix = storagePath(userId, homeId);
  const limit = 100;
  let offset = 0;
  const all: { name: string }[] = [];

  while (true) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(prefix, { limit, offset });

    if (error) {
      return { data: null, error };
    }

    const page = data ?? [];
    all.push(...page);
    if (page.length < limit) {
      break;
    }
    offset += limit;
  }

  return { data: all, error: null };
}

/** Home-scoped gallery count for My Home summary (not used by Gallery page). */
export async function getGalleryFileCount(
  userId: string,
  homeId: string
): Promise<number> {
  const { data, error } = await getCachedStorageList(
    userId,
    homeId,
    "summary",
    () => listAllStorageObjects(userId, homeId)
  );

  if (error) {
    return 0;
  }

  return data?.length ?? 0;
}

export type MyHomeData = {
  currentHome: Home | null;
  homes: Home[];
  currentHomeId: string | null;
};

export type CreateHomeInput = {
  name: string;
  address: string;
  apartmentNumber: string;
  city: string;
  state: string;
  zip: string;
};

export async function getHomeData(): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  return fetchMyHomeData();
}

export async function fetchMyHomeData(): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  try {
    const dashboard = await getDashboardState();

    if (!dashboard) {
      return { ok: false, message: "Not signed in." };
    }

    return {
      ok: true,
      data: {
        currentHome: dashboard.currentHome,
        homes: dashboard.homes,
        currentHomeId: dashboard.currentHomeId,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load homes.";
    console.error("[myHome] fetch homes", error);
    return { ok: false, message };
  }
}

export async function setCurrentHome(
  homeId: string
): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  const userId = await getCachedUserId();

  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  const { data: ownedHome, error: homeLookupError } = await supabase
    .from("homes")
    .select("id")
    .eq("user_id", userId)
    .eq("id", homeId)
    .maybeSingle();

  if (homeLookupError) {
    console.error("[myHome] validate home for setCurrentHome", homeLookupError);
    return {
      ok: false,
      message: homeLookupError.message || "Could not verify home.",
    };
  }

  if (!ownedHome) {
    return { ok: false, message: "Invalid home." };
  }

  const { error: stateError } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      current_home_id: homeId,
    },
    { onConflict: "user_id" }
  );

  if (stateError) {
    console.error("[myHome] upsert user_state", stateError);
    return {
      ok: false,
      message: stateError.message || "Could not set current home.",
    };
  }

  invalidateHomeCache();
  invalidateDashboardHomesCache();
  return fetchMyHomeData();
}

/** UI-facing alias for changing active property via user_state.current_home_id only. */
export async function switchActiveHome(
  homeId: string
): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  return setCurrentHome(homeId);
}

export const ACTIVATION_FAILED_MESSAGE =
  "Home created but activation failed. Please select property manually.";

async function fetchLatestHomeIdForUser(
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("homes")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[myHome] fetch latest home", error);
    return null;
  }

  return data?.id ?? null;
}

export async function createHome(
  input: CreateHomeInput
): Promise<
  | { ok: true; data: MyHomeData; createdHome: Home }
  | { ok: false; message: string }
> {
  const userId = await getCachedUserId();

  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  const name = input.name.trim();
  const address = input.address.trim();
  const apartmentNumber = input.apartmentNumber.trim();
  const city = input.city.trim();
  const state = input.state.trim();
  const zip = input.zip.trim();

  if (!name || !address || !city || !state || !zip) {
    return { ok: false, message: "Please fill in all required fields." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("homes")
    .insert({
      user_id: userId,
      name,
      address,
      apartment_number: apartmentNumber || null,
      city,
      state,
      zip,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[myHome] insert home", insertError);
    return {
      ok: false,
      message: insertError?.message || "Could not create home.",
    };
  }

  invalidateHomeCache();
  invalidateDashboardHomesCache();
  const refreshed = await fetchMyHomeData();
  if (!refreshed.ok) {
    return refreshed;
  }

  return {
    ok: true,
    data: refreshed.data,
    createdHome: mapHomeRow(inserted as HomeRow),
  };
}

export type CreateHomeResult =
  | { ok: true; home: Home }
  | { ok: false; error: string };

/** Creates a home and sets it as the active property in one coordinated flow. */
export async function createAndActivateHome(
  input: CreateHomeInput
): Promise<CreateHomeResult> {
  const userId = await getCachedUserId();

  if (!userId) {
    return {
      ok: false,
      error: "Not signed in.",
    };
  }

  const name = input.name.trim();
  const address = input.address.trim();
  const apartmentNumber = input.apartmentNumber.trim();
  const city = input.city.trim();
  const state = input.state.trim();
  const zip = input.zip.trim();

  if (!name || !address || !city || !state || !zip) {
    return {
      ok: false,
      error: "Please fill in all required fields.",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("homes")
    .insert({
      user_id: userId,
      name,
      address,
      apartment_number: apartmentNumber || null,
      city,
      state,
      zip,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[myHome] insert home", insertError);
    return {
      ok: false,
      error: insertError?.message || "Could not create home.",
    };
  }

  const createdHome = mapHomeRow(inserted as HomeRow);
  const homeId = (inserted as HomeRow).id;

  const { error: stateError } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      current_home_id: homeId,
    },
    { onConflict: "user_id" }
  );

  if (stateError) {
    console.error("[myHome] upsert user_state after create", stateError);

    const latestHomeId =
      (await fetchLatestHomeIdForUser(userId)) ?? homeId;
    const retry = await setCurrentHome(latestHomeId);

    if (retry.ok) {
      return {
        ok: true,
        home: createdHome,
      };
    }

    invalidateHomeCache();
    invalidateDashboardHomesCache();
    return {
      ok: false,
      error: ACTIVATION_FAILED_MESSAGE,
    };
  }

  invalidateHomeCache();
  invalidateDashboardHomesCache();
  const refreshed = await fetchMyHomeData();
  if (!refreshed.ok) {
    return {
      ok: false,
      error: refreshed.message,
    };
  }

  return {
    ok: true,
    home: createdHome,
  };
}
