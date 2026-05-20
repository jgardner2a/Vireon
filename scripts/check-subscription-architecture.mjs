/**
 * Hard subscription architecture guardrails.
 * Run: node scripts/check-subscription-architecture.mjs
 *      npm run check:architecture
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["app", "lib"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
]);
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/** @type {Array<{ rule: string; file: string; detail: string }>} */
const violations = [];

function norm(rel) {
  return rel.replace(/\\/g, "/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = norm(path.relative(ROOT, abs));
    if (SKIP_DIRS.has(name)) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (EXT.has(path.extname(name))) out.push({ abs, rel });
  }
  return out;
}

function lineHasAllow(content, index, tag) {
  const prev = content.split("\n")[index - 1] ?? "";
  const cur = content.split("\n")[index] ?? "";
  return (
    prev.includes(tag) ||
    cur.includes(tag) ||
    prev.includes("subscription-arch: allow")
  );
}

function checkFile({ abs, rel }) {
  const content = fs.readFileSync(abs, "utf8");
  const lines = content.split("\n");

  // 1) Plan read from dataCache
  const dataCachePlan =
    /dataCache\s*\.\s*profilePlan\b|dataCache\s*\[\s*['"]profilePlan['"]\s*\]|profilePlan\s*:\s*UserPlan/.test(
      content
    );
  if (dataCachePlan) {
    violations.push({
      rule: "no-dataCache-plan",
      file: rel,
      detail: "Subscription plan must not be read from or stored on dataCache.",
    });
  }

  // 2) Plan read from localStorage (runtime tier)
  lines.forEach((line, i) => {
    if (!/localStorage|readLegacyUsers|LEGACY_USERS_KEY|StoredUser/.test(line)) {
      return;
    }
    if (!/\bplan\b/.test(line) && !/legacy\.plan/.test(line)) return;
    if (/allow-legacy-plan-seed|subscription-arch:\s*allow/.test(line)) return;
    if (lineHasAllow(content, i, "allow-legacy-plan-seed")) return;
    if (
      rel === "lib/authUsers.ts" &&
      /plan:\s*legacy\.plan|plan\?:\s*["']free["']/.test(line) &&
      (line.includes("insert") ||
        line.includes("StoredUser") ||
        line.includes("Legacy localStorage"))
    ) {
      return;
    }
    if (/Do not use cache|never used for feature|subscription-arch/.test(line)) {
      return;
    }
    if (/localStorage\.(get|set|remove)Item/.test(line) && !/plan/.test(line)) {
      return;
    }
    if (legacyPlanSeedOnly(line, lines, i, rel)) return;

    violations.push({
      rule: "no-localStorage-plan",
      file: rel,
      detail: `Line ${i + 1}: tier must not be read from localStorage — use getSubscriptionPlan.`,
    });
  });

  // 3) Duplicate / legacy fetchProfilePlan implementations
  if (
    /\bfunction\s+fetchProfilePlan\b|\basync\s+function\s+fetchProfilePlan\b|\bexport\s+async\s+function\s+fetchProfilePlanById\b/.test(
      content
    ) &&
    rel !== "lib/subscription/subscription.ts"
  ) {
    violations.push({
      rule: "no-fetchProfilePlan-dup",
      file: rel,
      detail:
        "Use getSubscriptionPlan from @/lib/subscription/subscription — no fetchProfilePlan duplicates.",
    });
  }
  if (
    /\bfetchProfilePlanById\b|\bfetchProfilePlan\s*\(/.test(content) &&
    !content.includes("getSubscriptionPlan")
  ) {
    violations.push({
      rule: "no-fetchProfilePlan-usage",
      file: rel,
      detail: "Replace fetchProfilePlan / fetchProfilePlanById with getSubscriptionPlan.",
    });
  }

  // 4) Direct profiles.plan SELECT outside STL
  if (rel !== "lib/subscription/subscription.ts") {
    const directPlanSelect =
      /\.from\s*\(\s*['"]profiles['"]\s*\)[\s\S]{0,400}?\.select\s*\([^)]*\bplan\b/.test(
        content
      ) ||
      /\.select\s*\(\s*['"][^'"]*\bplan\b[^'"]*['"]\s*\)/.test(content);
    if (directPlanSelect && !/subscription-arch:\s*allow/.test(content)) {
      const isAuthSeed =
        rel === "lib/authUsers.ts" &&
        /\.insert\s*\(/.test(content) &&
        !/\.select\s*\([^)]*\bplan\b/.test(content.split(".insert")[1] ?? "");
      if (!isAuthSeed) {
        violations.push({
          rule: "no-direct-profiles-plan-select",
          file: rel,
          detail:
            "Only lib/subscription/subscription.ts may SELECT profiles.plan — use getSubscriptionPlan.",
        });
      }
    }
  }

  // 5) isPro only in STL + permissions (+ server routes after getSubscriptionPlan)
  if (/\bisPro\s*\(/.test(content)) {
    const allowed = isProAllowed(rel, content);
    if (!allowed) {
      violations.push({
        rule: "no-ui-isPro",
        file: rel,
        detail:
          "isPro() only allowed in lib/subscription/subscription.ts, lib/permissions.ts, or app/api routes that call getSubscriptionPlan.",
      });
    }
  }

  // 6) UI tier string compares
  if (isUiPath(rel) && /\bplan\s*===\s*['"](?:free|pro)['"]/.test(content)) {
    violations.push({
      rule: "no-ui-plan-compare",
      file: rel,
      detail: "UI must not compare plan strings — use permissions helpers with STL plan.",
    });
  }

  // 7) useSubscriptionPlan in server paths
  if (
    /useSubscriptionPlan\s*\(/.test(content) &&
    (rel.includes("app/api/") || rel.startsWith("lib/data/") || rel.includes("Store"))
  ) {
    violations.push({
      rule: "no-hook-on-server",
      file: rel,
      detail:
        "useSubscriptionPlan is client-only — use getSubscriptionPlan in server/API code.",
    });
  }
}

function legacyPlanSeedOnly(line, lines, i, rel) {
  if (rel !== "lib/authUsers.ts") return false;
  const window = lines.slice(Math.max(0, i - 3), i + 2).join("\n");
  return (
    window.includes("allow-legacy-plan-seed") &&
    (line.includes("legacy.plan") || line.includes("plan:"))
  );
}

function isUiPath(rel) {
  return (
    rel.startsWith("app/my-home/") ||
    rel.startsWith("app/components/") ||
    (rel.startsWith("app/") && !rel.includes("app/api/"))
  );
}

function isProAllowed(rel, content) {
  if (rel === "lib/subscription/subscription.ts") return true;
  if (rel === "lib/permissions.ts") return true;

  if (/^app\/api\/.*\/route\.(ts|js)$/.test(rel)) {
    return content.includes("getSubscriptionPlan");
  }

  return false;
}

function checkServerRoutes(files) {
  const routes = files.filter((f) => /^app\/api\/.*\/route\.(ts|js)$/.test(f.rel));
  const tierPattern =
    /\b(isPro|canCreateProperty|canUploadGalleryMedia|getVaultAccessLevel|FULL_PACKAGE|BASIC_SNAPSHOT|exportProfileForPlan|resolveExportProfileFromPlan|profiles\.plan)\s*\(/;

  for (const { rel, abs } of routes) {
    const content = fs.readFileSync(abs, "utf8");
    if (!tierPattern.test(content) && !/from\s*\(\s*['"]profiles['"]\s*\)/.test(content)) {
      continue;
    }
    if (!content.includes("getSubscriptionPlan")) {
      violations.push({
        rule: "server-route-stl",
        file: rel,
        detail:
          "API route with tier logic must call getSubscriptionPlan(profileId) from STL.",
      });
    }
  }
}

const files = [];
for (const root of SCAN_ROOTS) {
  walk(path.join(ROOT, root), files);
}

for (const file of files) {
  checkFile(file);
}
checkServerRoutes(files);

if (violations.length === 0) {
  console.log("check-subscription-architecture: OK");
  process.exit(0);
}

console.error("check-subscription-architecture: FAILED\n");
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}`);
  console.error(`    ${v.detail}\n`);
}
process.exit(1);
