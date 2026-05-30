import { gatherEvidenceInventory } from "@/lib/export/gatherEvidenceInventory";
import type { Home } from "@/lib/home/homeMapper";
import { computeVaultSummary } from "@/lib/vault/vaultSummary";
import { supabase } from "@/lib/supabaseClient";

export type PropertyDataSummary = {
  homeId: string;
  name: string;
  address: string;
  totalRecords: number;
  totalImages: number;
  documentCount: number;
};

export type UserDataSummary = {
  properties: PropertyDataSummary[];
  propertyCount: number;
  totalRecords: number;
  totalImages: number;
  documentCount: number;
};

export type UserDataSummaryResult =
  | { ok: true; summary: UserDataSummary }
  | { ok: false; message: string };

function buildDocumentCountMap(
  homeIds: string[],
  rows: Array<{ home_id: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const homeId of homeIds) {
    counts.set(homeId, 0);
  }

  for (const row of rows) {
    const homeId = row.home_id;
    if (!counts.has(homeId)) {
      continue;
    }
    counts.set(homeId, (counts.get(homeId) ?? 0) + 1);
  }

  return counts;
}

export async function gatherUserDataSummary(
  userId: string,
  homes: Home[]
): Promise<UserDataSummaryResult> {
  if (homes.length === 0) {
    return {
      ok: true,
      summary: {
        properties: [],
        propertyCount: 0,
        totalRecords: 0,
        totalImages: 0,
        documentCount: 0,
      },
    };
  }

  const homeIds = homes.map((home) => home.id);
  const properties: PropertyDataSummary[] = [];
  let totalRecords = 0;
  let totalImages = 0;

  for (const home of homes) {
    const inventoryResult = await gatherEvidenceInventory(userId, home.id);
    if (!inventoryResult.ok) {
      return { ok: false, message: inventoryResult.message };
    }

    const vaultSummary = computeVaultSummary(inventoryResult.inventory);
    totalRecords += vaultSummary.totalRecords;
    totalImages += vaultSummary.totalImages;

    properties.push({
      homeId: home.id,
      name: home.name,
      address: home.address,
      totalRecords: vaultSummary.totalRecords,
      totalImages: vaultSummary.totalImages,
      documentCount: 0,
    });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("home_id")
    .in("home_id", homeIds);

  if (error) {
    console.error("[account] document counts", error);
    return {
      ok: false,
      message: error.message || "Could not load document counts.",
    };
  }

  const documentCounts = buildDocumentCountMap(
    homeIds,
    (data ?? []) as Array<{ home_id: string }>
  );

  let documentCount = 0;
  const propertiesWithDocuments = properties.map((property) => {
    const count = documentCounts.get(property.homeId) ?? 0;
    documentCount += count;
    return {
      ...property,
      documentCount: count,
    };
  });

  return {
    ok: true,
    summary: {
      properties: propertiesWithDocuments,
      propertyCount: homes.length,
      totalRecords,
      totalImages,
      documentCount,
    },
  };
}
