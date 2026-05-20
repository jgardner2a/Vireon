import { hydrateFromSupabase } from "./data/hydrate";
import { migrateLegacyLocalStorageIfNeeded } from "./data/migrateLocal";
import { ensureDefaultFoldersForAllProperties } from "./galleryFoldersStore";
import { syncLeasesWithProperties } from "./leasesStore";
import { syncCurrentUserPropertiesCount } from "./propertiesStore";

/**
 * Loads renter data from Supabase and aligns derived records.
 * Does NOT cache subscription plan — tier checks use `getSubscriptionPlan(profileId)`.
 */
export async function bootstrapMyHomeData(): Promise<void> {
  if (typeof window === "undefined") return;

  await hydrateFromSupabase();
  await migrateLegacyLocalStorageIfNeeded();
  await ensureDefaultFoldersForAllProperties();
  await syncCurrentUserPropertiesCount();
  await syncLeasesWithProperties();
}
