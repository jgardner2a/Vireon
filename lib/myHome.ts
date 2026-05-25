import { getCurrentUserId } from "@/lib/auth/getCurrentUserId";
import { getActiveHomeId } from "@/lib/home/getActiveHomeId";
import { STORAGE_BUCKET, storagePath } from "@/lib/storagePath";
import {
  getCurrentHome,
  getPreviousHomes,
} from "./homeContext";
import { supabase } from "./supabaseClient";

/** Home-scoped gallery count for My Home summary (not used by Gallery page). */
export async function getGalleryFileCount(
  userId: string,
  homeId: string
): Promise<number> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(storagePath(userId, homeId), { limit: 100 });

  if (error) {
    return 0;
  }

  return data?.length ?? 0;
}

export type Home = {
  id: string;
  name: string;
  address: string;
};

type HomeRow = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  apartment_number: string | null;
  city: string;
  state: string;
  zip: string;
  created_at: string;
};

export type MyHomeData = {
  currentHome: Home | null;
  previousHomes: Home[];
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

function formatHomeAddress(row: HomeRow): string {
  const parts: string[] = [row.address];
  if (row.apartment_number?.trim()) {
    parts.push(`Apt ${row.apartment_number.trim()}`);
  }
  const cityState = [row.city, row.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (row.zip?.trim()) parts.push(row.zip.trim());
  return parts.join(", ");
}

function mapHomeRow(row: HomeRow): Home {
  return {
    id: row.id,
    name: row.name,
    address: formatHomeAddress(row),
  };
}

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
  const userId = await getCurrentUserId();

  if (!userId) {
    return { ok: false, message: "Not signed in." };
  }

  const [homesResult, currentHomeId] = await Promise.all([
    supabase.from("homes").select("*").eq("user_id", userId),
    getActiveHomeId(userId),
  ]);

  if (homesResult.error) {
    console.error("[myHome] fetch homes", homesResult.error);
    return {
      ok: false,
      message: homesResult.error.message || "Could not load homes.",
    };
  }

  const rows = (homesResult.data ?? []) as HomeRow[];
  const homes = rows.map(mapHomeRow);
  const userState = { current_home_id: currentHomeId };
  const currentHome = getCurrentHome(homes, userState);
  const previousHomes = getPreviousHomes(homes, currentHomeId);

  return {
    ok: true,
    data: { currentHome, previousHomes, homes, currentHomeId },
  };
}

export async function setCurrentHome(
  homeId: string
): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  const userId = await getCurrentUserId();

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

  return fetchMyHomeData();
}

export async function createHome(
  input: CreateHomeInput
): Promise<
  | { ok: true; data: MyHomeData; createdHome: Home }
  | { ok: false; message: string }
> {
  const userId = await getCurrentUserId();

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
