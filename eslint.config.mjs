import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const snapshotBoundaryImports = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@/lib/gallery/uploadStorageFiles",
          message:
            "Snapshots own uploads via uploadSnapshotImage() — do not import the Gallery upload pipeline.",
        },
      ],
      patterns: [
        {
          group: ["@/app/dashboard/gallery/**"],
          message:
            "Do not import Gallery page code into snapshot modules.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["lib/snapshots/**/*.ts"],
    rules: snapshotBoundaryImports,
  },
  {
    files: ["app/dashboard/snapshots/**/*.tsx"],
    rules: snapshotBoundaryImports,
  },
]);

export default eslintConfig;
