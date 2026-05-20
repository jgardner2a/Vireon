/**
 * Static verification of evidence target validation (no browser required).
 * Run: node scripts/verify-evidence-targets.mjs
 */

function isTransientEvidenceEntityId(id) {
  const trimmed = id.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("__")) return true;
  if (/^(temp|ui|draft|preview)[-:]/i.test(trimmed)) return true;
  return false;
}

function normalizeEvidenceTargetType(raw) {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim().toLowerCase();
  if (
    key === "issue" ||
    key === "incident" ||
    key === "maintenance" ||
    key === "lease"
  ) {
    return key;
  }
  if (key === "maintenance_request") return "maintenance";
  if (key === "lease_record") return "lease";
  return undefined;
}

function isForbiddenEvidenceTargetType(raw) {
  if (typeof raw !== "string") return true;
  const key = raw.trim().toLowerCase();
  if (
    key === "media" ||
    key === "folder" ||
    key === "document" ||
    key === "gallery_folder"
  ) {
    return true;
  }
  return false;
}

function validateEvidenceTargetIdentity(targetType, targetId) {
  if (isForbiddenEvidenceTargetType(targetType)) {
    return { ok: false };
  }
  if (!normalizeEvidenceTargetType(targetType)) {
    return { ok: false };
  }
  const id = String(targetId ?? "").trim();
  if (!id || isTransientEvidenceEntityId(id)) {
    return { ok: false };
  }
  return { ok: true };
}

const checks = [
  [
    "normalize maintenance_request -> maintenance",
    normalizeEvidenceTargetType("maintenance_request") === "maintenance",
  ],
  [
    "reject folder as target",
    isForbiddenEvidenceTargetType("folder") === true,
  ],
  [
    "reject media as target",
    isForbiddenEvidenceTargetType("media") === true,
  ],
  [
    "reject transient target id",
    validateEvidenceTargetIdentity("issue", "__picker").ok === false,
  ],
  [
    "accept issue target",
    validateEvidenceTargetIdentity("issue", "42").ok === true,
  ],
  [
    "accept maintenance target",
    validateEvidenceTargetIdentity("maintenance", "7").ok === true,
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

console.log("\nAll evidence target checks passed.");
