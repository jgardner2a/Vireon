import { supabase } from "../supabaseClient";

export async function countIssuesForProperty(
  profileId: string,
  propertyId: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[propertyResourceCount] countIssuesForProperty", error);
    return null;
  }
  return count ?? 0;
}

export async function countGalleryMediaForProperty(
  profileId: string,
  propertyId: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from("gallery_media")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("[propertyResourceCount] countGalleryMediaForProperty", error);
    return null;
  }
  return count ?? 0;
}
