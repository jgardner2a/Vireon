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

/** Home-scoped gallery count for My Home summary (not used by Gallery page). */
export async function getGalleryFileCount(
  userId: string,
  homeId: string
): Promise<number> {
  const { data, error } = await getCachedStorageList(
    userId,
    homeId,
    "summary",
    () =>
      supabase.storage
        .from(STORAGE_BUCKET)
        .list(storagePath(userId, homeId), { limit: 100 })
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
  return fetchMyHomeData();
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
