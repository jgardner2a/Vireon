import { supabase } from "./supabaseClient";

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

export async function fetchMyHomeData(): Promise<
  | { ok: true; data: MyHomeData }
  | { ok: false; message: string }
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[myHome] getUser", userError);
    return { ok: false, message: userError.message || "Could not load user." };
  }

  if (!user?.id) {
    return { ok: false, message: "Not signed in." };
  }

  const userId = user.id;

  const [homesResult, stateResult] = await Promise.all([
    supabase.from("homes").select("*").eq("user_id", userId),
    supabase
      .from("user_state")
      .select("current_home_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (homesResult.error) {
    console.error("[myHome] fetch homes", homesResult.error);
    return {
      ok: false,
      message: homesResult.error.message || "Could not load homes.",
    };
  }

  if (stateResult.error) {
    console.error("[myHome] fetch user_state", stateResult.error);
    return {
      ok: false,
      message: stateResult.error.message || "Could not load home state.",
    };
  }

  const rows = (homesResult.data ?? []) as HomeRow[];
  const homes = rows.map(mapHomeRow);
  const currentHomeId = stateResult.data?.current_home_id ?? null;

  const currentHome =
    currentHomeId != null
      ? (homes.find((h) => h.id === currentHomeId) ?? null)
      : null;

  const previousHomes = homes.filter((h) => h.id !== currentHome?.id);

  return { ok: true, data: { currentHome, previousHomes } };
}

export async function createHome(
  input: CreateHomeInput
): Promise<
  | { ok: true; data: MyHomeData; wasFirstHome: boolean }
  | { ok: false; message: string }
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return { ok: false, message: "Not signed in." };
  }

  const userId = user.id;
  const name = input.name.trim();
  const address = input.address.trim();
  const apartmentNumber = input.apartmentNumber.trim();
  const city = input.city.trim();
  const state = input.state.trim();
  const zip = input.zip.trim();

  if (!name || !address || !city || !state || !zip) {
    return { ok: false, message: "Please fill in all required fields." };
  }

  const existing = await supabase
    .from("homes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (existing.error) {
    console.error("[myHome] count homes", existing.error);
    return {
      ok: false,
      message: existing.error.message || "Could not verify homes.",
    };
  }

  const isFirstHome = (existing.count ?? 0) === 0;

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

  if (isFirstHome) {
    const { error: stateError } = await supabase.from("user_state").upsert(
      {
        user_id: userId,
        current_home_id: inserted.id,
      },
      { onConflict: "user_id" }
    );

    if (stateError) {
      console.error("[myHome] upsert user_state", stateError);
      return {
        ok: false,
        message: stateError.message || "Home created but could not set current home.",
      };
    }
  }

  const refreshed = await fetchMyHomeData();
  if (!refreshed.ok) {
    return refreshed;
  }

  return { ok: true, data: refreshed.data, wasFirstHome: isFirstHome };
}
