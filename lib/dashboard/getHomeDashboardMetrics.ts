import { getGalleryFileCount } from "@/lib/myHome";
import { getNotesCount } from "@/lib/notes/getNotesCount";
import { supabase } from "@/lib/supabaseClient";

export type HomeDashboardMetrics = {
  galleryCount: number;
  maintenanceCount: number;
  notesCount: number;
};

async function getMaintenanceLogCount(
  userId: string,
  homeId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("maintenance_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("home_id", homeId);

  if (error) {
    console.error("[dashboard] maintenance count", error);
    return 0;
  }

  return count ?? 0;
}

export async function getHomeDashboardMetrics(
  userId: string,
  homeId: string
): Promise<HomeDashboardMetrics> {
  const [galleryCount, maintenanceCount, notesCount] = await Promise.all([
    getGalleryFileCount(userId, homeId),
    getMaintenanceLogCount(userId, homeId),
    getNotesCount(userId, homeId),
  ]);

  return { galleryCount, maintenanceCount, notesCount };
}
