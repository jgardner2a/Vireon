# Vireon System Architecture (Authoritative)

This document is the **only** valid layering model. Code must not bypass these boundaries.

## Layers

### 1. My Home (input layer)

**Paths:** `lib/*Store.ts`, `lib/gallery/`, `lib/data/repos.ts`, `app/my-home/**` (except Vault UI)

**Role:** User-generated raw data — issues, gallery uploads, properties, documents, incidents.

**May:** Write entities to Supabase via repos; create evidence links **only** through `lib/gallery` → `lib/evidence/persistLinks.ts`.

**Must not:** Serve Places; compute analytics; own Vault projections.

---

### 2. Evidence (relational layer)

**Paths:** `lib/evidence/**` (except `vault/`), `lib/evidence/persistLinks.ts`, Supabase `evidence_links`

**Role:** Relationships only (source → target). Links media/folders/documents to issues, incidents, maintenance, leases.

**Is NOT:** Files, uploads, UI state, analytics, Vault content.

**May:** Validate links; resolve targets; persist **only** via `persistLinks.ts` → Supabase.

**Must not:** Store file bytes; write from Vault; be read by Places directly.

---

### 3. Vault (view layer)

**Paths:** `lib/evidence/vault/**`, `app/my-home/vault/**`

**Role:** Read-only projection of Evidence + hydrated My Home metadata for timeline/UI.

**Must not:** Call `upsertEvidenceLink`, `clearEvidenceLink`, or any persist/write APIs.

---

### 4. Aggregate Insights (derivation layer)

**Paths:** `lib/insights/**`

**Role:** Computed summaries (dashboard, future trends). Derived from hydrated cache **via** `lib/myHome/reads.ts` and Evidence link queries — **not** a source of truth.

**Must not:** Persist structural data; feed back into Evidence; be imported by My Home stores.

---

### 5. Places (external layer)

**Paths:** `app/page.tsx`, `app/components/PlacesMap.tsx`, `lib/savedPlaces.ts`, `lib/useSavedPlaces.ts`, `lib/placesCatalog.ts`

**Role:** Map + saved listings UI.

**May:** Import `@/lib/insights` for renter-derived map context (when needed).

**Must not:** Import My Home stores, Evidence, Vault, or `lib/data/*`.

---

## Data flow (required)

```
My Home (create) → Evidence (link) → Vault (visualize)
Evidence → Aggregate Insights → Places
```

## Forbidden edges

| From | To | Status |
|------|-----|--------|
| My Home UI | Places data APIs | Forbidden |
| Vault | Evidence writes | Forbidden |
| Places | Evidence / My Home stores | Forbidden |
| Gallery | Places | Forbidden |
| Insights | Evidence writes | Forbidden |
| Cache (`lib/data/cache.ts`) | Source of truth | Forbidden — hydrate from Supabase only |

## Cache rule

`lib/data/cache.ts` is a **performance mirror** of Supabase. All writes go to Supabase first; cache is updated after success. Clearing browser storage must not delete renter data.

## Evidence clarity

- **Files** → Supabase Storage + `gallery_media.storage_path`
- **Relationships** → `evidence_links` only
- Embedded `evidenceLink` on gallery rows is a **hydration mirror**, not a second store

### 6. Export (read-only sidecar)

**Paths:** `lib/export/**`, `app/api/export/route.ts`

**Role:** Compile evidence packages from Supabase only (Postgres + Storage). Stateless; never writes.

**Triggered by:** Vault UI via `triggerExportDownload({ scope })` → API route → `runExport()`.

**Tier authority:** Only `app/api/export/route.ts` assigns `BASIC_SNAPSHOT` vs `FULL_PACKAGE` from Supabase `profiles.plan`. UI cannot override.

**Must not:** Import stores, cache, Vault, Places, or `persistLinks`.

---

## Enforcement

- ESLint: `eslint.config.mjs` (`no-restricted-imports` per layer)
- Read facades: `lib/myHome/reads.ts`, `lib/evidence/persistLinks.ts`
- Allowlist: `lib/uiState/allowedLocalStorage.ts`
