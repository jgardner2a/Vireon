import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const evidenceWriteModules = [
  "@/lib/data/evidence",
  "@/lib/evidence/persistLinks",
];

const myHomeStoreModules = [
  "@/lib/propertiesStore",
  "@/lib/issuesStore",
  "@/lib/galleryStore",
  "@/lib/galleryFoldersStore",
  "@/lib/leasesStore",
  "@/lib/incidentsStore",
  "@/lib/documentsStore",
  "@/lib/data/repos",
  "@/lib/data/hydrate",
];

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
    files: ["app/my-home/vault/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/export/profiles",
              message: "Export tier is resolved only in app/api/export/route.ts",
            },
            {
              name: "@/lib/export/engine",
              message: "Vault must use @/lib/export/client only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/export/client.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/export/profiles",
              message: "Client must not send export tier; use API route authority.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "app/page.tsx",
      "app/components/PlacesMap.tsx",
      "lib/savedPlaces.ts",
      "lib/useSavedPlaces.ts",
      "lib/placesCatalog.ts",
      "lib/placeListingFromSearch.ts",
      "lib/pendingPlaceSave.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...myHomeStoreModules.map((name) => ({
              name,
              message:
                "Places layer must use @/lib/insights only for renter-derived data.",
            })),
            {
              name: "@/lib/evidence",
              message: "Places must not import Evidence directly.",
            },
            {
              name: "@/lib/evidence/vault",
              message: "Places must not import Vault.",
            },
            {
              name: "@/lib/myHome/reads",
              message: "Places must use @/lib/insights, not My Home reads.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/evidence/vault/**/*.ts", "app/my-home/vault/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...evidenceWriteModules.map((name) => ({
              name,
              message: "Vault is read-only; cannot write Evidence.",
            })),
            {
              name: "@/lib/gallery/evidence",
              message: "Vault cannot assign evidence links.",
            },
            {
              name: "@/lib/galleryStore",
              message:
                "Vault must use lib/evidence/vault/reads or lib/myHome/reads.",
            },
            {
              name: "@/lib/galleryFoldersStore",
              message:
                "Vault must use lib/evidence/vault/reads or lib/myHome/reads.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/my-home/**/*.{ts,tsx}"],
    ignores: ["app/my-home/vault/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: evidenceWriteModules.map((name) => ({
            name,
            message:
              "Assign evidence via @/lib/gallery (assignGallery*Evidence), not persistLinks directly.",
          })),
        },
      ],
    },
  },
  {
    files: ["lib/export/**/*.ts", "app/api/export/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/savedPlaces", message: "Export must not use Places." },
            { name: "@/lib/placesCatalog", message: "Export must not use Places." },
            { name: "@/lib/useSavedPlaces", message: "Export must not use Places." },
            { name: "@/lib/evidence/vault", message: "Export must not read Vault projections." },
            { name: "@/lib/evidence/persistLinks", message: "Export is read-only." },
            { name: "@/lib/data/cache", message: "Export must fetch from Supabase, not UI cache." },
            { name: "@/lib/propertiesStore", message: "Use lib/export/supabaseRead.ts" },
            { name: "@/lib/issuesStore", message: "Use lib/export/supabaseRead.ts" },
            { name: "@/lib/galleryStore", message: "Use lib/export/supabaseRead.ts" },
            { name: "@/lib/insights", message: "Export inlines derivation; do not import Insights module." },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/insights/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...evidenceWriteModules.map((name) => ({
              name,
              message: "Insights cannot write Evidence.",
            })),
            ...myHomeStoreModules.map((name) => ({
              name,
              message: "Insights must use lib/insights/reads.ts adapters only.",
            })),
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
