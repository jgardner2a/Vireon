import { supabase } from "@/lib/supabaseClient";

export type Folder = {
  id: string;
  name: string;
  user_id: string;
  home_id: string;
};

type FolderRow = Folder & {
  created_at?: string;
};

export async function fetchFoldersForHome(
  userId: string,
  homeId: string
): Promise<{ ok: true; folders: Folder[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, user_id, home_id, created_at")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[gallery] fetch folders", error);
    return {
      ok: false,
      message: error.message || "Could not load folders.",
    };
  }

  const folders = (data ?? []).map((row) => {
    const r = row as FolderRow;
    return {
      id: r.id,
      name: r.name,
      user_id: r.user_id,
      home_id: r.home_id,
    };
  });

  return { ok: true, folders };
}

export async function createFolder(
  userId: string,
  homeId: string,
  name: string
): Promise<{ ok: true; folder: Folder } | { ok: false; message: string }> {
  const trimmed = name.trim();

  if (!trimmed) {
    return { ok: false, message: "Please enter a folder name." };
  }

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("folders")
    .insert({
      user_id: userId,
      home_id: homeId,
      name: trimmed,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("id, name, user_id, home_id")
    .single();

  if (error || !data) {
    console.error("[gallery] create folder", error);
    return {
      ok: false,
      message: error?.message || "Could not create folder.",
    };
  }

  const row = data as FolderRow;
  return {
    ok: true,
    folder: {
      id: row.id,
      name: row.name,
      user_id: row.user_id,
      home_id: row.home_id,
    },
  };
}
