/**
 * Static verification of evidence source validation (no browser required).
 * Run: node scripts/verify-evidence-sources.mjs
 */

function isTransientEvidenceSourceId(sourceId) {
  const id = sourceId.trim();
  if (!id) return true;
  if (id.startsWith("__")) return true;
  if (/^(temp|ui|draft|preview)[-:]/i.test(id)) return true;
  return false;
}

function normalizeEvidenceSourceType(raw) {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim();
  if (key === "media" || key === "folder" || key === "document") return key;
  if (key === "gallery_media") return "media";
  if (key === "gallery_folder") return "folder";
  return undefined;
}

function validateFolderEvidenceSource(folder) {
  if (isTransientEvidenceSourceId(folder.id)) {
    return { ok: false };
  }
  if (folder.type === "system") {
    return { ok: false };
  }
  if (folder.type !== "user") {
    return { ok: false };
  }
  if (folder.mediaIds.length === 0) {
    return { ok: false };
  }
  return { ok: true };
}

const checks = [
  [
    "normalize gallery_media -> media",
    normalizeEvidenceSourceType("gallery_media") === "media",
  ],
  [
    "normalize gallery_folder -> folder",
    normalizeEvidenceSourceType("gallery_folder") === "folder",
  ],
  [
    "reject transient __unassigned__",
    isTransientEvidenceSourceId("__unassigned__") === true,
  ],
  [
    "reject empty folder",
    validateFolderEvidenceSource({
      id: "f1",
      type: "user",
      mediaIds: [],
    }).ok === false,
  ],
  [
    "reject system folder",
    validateFolderEvidenceSource({
      id: "unsorted",
      type: "system",
      mediaIds: ["m1"],
    }).ok === false,
  ],
  [
    "accept user folder with media",
    validateFolderEvidenceSource({
      id: "f1",
      type: "user",
      mediaIds: ["m1"],
    }).ok === true,
  ],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("\nAll evidence source checks passed.");
