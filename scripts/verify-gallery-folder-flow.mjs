/**
 * Static verification of gallery folder type rules (no browser required).
 * Run: node scripts/verify-gallery-folder-flow.mjs
 */

function isSystemFolder(folder) {
  return folder.type === "system";
}

function isUserFolder(folder) {
  return folder.type === "user";
}

function canRenameFolder(folder) {
  return isUserFolder(folder);
}

function canDeleteFolder(folder) {
  return isUserFolder(folder);
}

function canAssignFolderEvidence(folder) {
  if (!isUserFolder(folder)) return false;
  if (folder.id != null && folder.mediaIds != null) {
    return (
      isUserFolder(folder) &&
      !isSystemFolder(folder) &&
      folder.mediaIds.length > 0
    );
  }
  return true;
}

const system = { type: "system", id: "sys-1", mediaIds: ["m1"] };
const userWithMedia = { type: "user", id: "user-1", mediaIds: ["m1"] };
const userEmpty = { type: "user", id: "user-2", mediaIds: [] };
const userMinimal = { type: "user" };

const checks = [
  ["isSystemFolder(system)", isSystemFolder(system) === true],
  ["isUserFolder(userWithMedia)", isUserFolder(userWithMedia) === true],
  ["!isUserFolder(system)", isUserFolder(system) === false],
  ["canRenameFolder(userWithMedia)", canRenameFolder(userWithMedia) === true],
  ["!canRenameFolder(system)", canRenameFolder(system) === false],
  ["canDeleteFolder(userWithMedia)", canDeleteFolder(userWithMedia) === true],
  ["!canDeleteFolder(system)", canDeleteFolder(system) === false],
  [
    "canAssignFolderEvidence(userWithMedia)",
    canAssignFolderEvidence(userWithMedia) === true,
  ],
  [
    "!canAssignFolderEvidence(system)",
    canAssignFolderEvidence(system) === false,
  ],
  [
    "!canAssignFolderEvidence(userEmpty)",
    canAssignFolderEvidence(userEmpty) === false,
  ],
  [
    "canAssignFolderEvidence(userMinimal)",
    canAssignFolderEvidence(userMinimal) === true,
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

console.log("\nAll rule-layer checks passed.");
