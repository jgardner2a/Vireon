# Vireon Data Source Audit

**Date:** 2026-05-18  
**Target architecture:** Supabase = sole persistent truth; LocalStorage = UI-only.

**Implementation:** `bootstrapMyHomeData()` hydrates `lib/data/cache.ts` from Supabase; writes go through `lib/data/repos.ts` and `lib/data/evidence.ts`. One-time legacy import: `lib/data/migrateLocal.ts`. Allowlist: `lib/uiState/allowedLocalStorage.ts`.

**Deploy checklist:** Run `supabase/migrations/001_core_renter_schema.sql`, create a **public** Storage bucket named `gallery`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Summary

| Layer | Before audit | After migration |
|-------|----------------|-----------------|
| Core renter data | `localStorage` only | **Supabase Postgres + Storage** |
| Evidence links | Embedded on `gallery` / `galleryFolders` JSON | **`evidence_links` table** |
| Media bytes | Base64 `dataUrl` in `localStorage` | **Supabase Storage** + `storage_path` |
| Vault | Read-only projection of stores | Unchanged (reads Supabase-backed cache) |
| Move checklists | `localStorage` (personal utility) | **Allowed** (UI-only) |
| Auth session email | `localStorage` `auth` | **Allowed** (session UI) |
| Saved places | `localStorage` per email | **Allowed** (UI preference) |

---

## A) Findings map

### Core renter data (MUST be Supabase)

| Domain | File(s) | Previous | Keys / fields | After |
|--------|---------|----------|---------------|-------|
| Properties | `lib/propertiesStore.ts` | LocalStorage | `properties` | `properties` table |
| Issues | `lib/issuesStore.ts` | LocalStorage | `issues` | `issues` table |
| Gallery media | `lib/galleryStore.ts` | LocalStorage | `gallery` (+ base64 `dataUrl`) | `gallery_media` + Storage bucket `gallery` |
| Gallery folders | `lib/galleryFoldersStore.ts` | LocalStorage | `galleryFolders` | `gallery_folders` + `gallery_folder_media` |
| Evidence links | embedded in gallery/folders | LocalStorage | `evidenceLink` on records | `evidence_links` table |
| Leases | `lib/leasesStore.ts` | LocalStorage | `leases` | `leases` table |
| Incidents | `lib/incidentsStore.ts` | LocalStorage | `incidents` | `incidents` table |
| Documents | `lib/documentsStore.ts` | LocalStorage | `documents` | `documents` table + Storage |
| User accounts | `lib/authUsers.ts` | LocalStorage | `vireonUsers` | `profiles` table |

### Vault (never persisted)

| Domain | File(s) | Storage | Notes |
|--------|---------|---------|-------|
| Vault feeds | `lib/evidence/vault/*` | None | In-memory projection only |
| Export preview JSON | `app/my-home/vault/page.tsx` | React state | Not persisted |

### UI-only LocalStorage (ALLOWED)

| Domain | File(s) | Key | Purpose |
|--------|---------|-----|---------|
| Auth session | `lib/authSession.ts` | `auth` | Signed-in email |
| Move checklists | `lib/moveChecklist.ts` | `vireon-personal-checklist:*` | Personal task UI |
| Saved places | `lib/savedPlaces.ts` | `vireon:saved-places:*` | Map UI prefs |
| Gallery one-time reset | `lib/galleryReset.ts` | `vireon-gallery-empty-reset-v1` | Migration marker |

### Supabase (pre-migration)

| File | Usage |
|------|--------|
| `lib/supabaseClient.ts` | Client only |
| `app/test/page.tsx` | Test query |

---

## B) Violations removed

- Dual persistence of gallery media as base64 in browser
- Embedded `evidenceLink` as source of truth (now derived from `evidence_links`)
- Core entity reads/writes to `localStorage`
- `galleryFolders` reading `gallery` key for folder sync (replaced by join table)

---

## C) Verification checklist

1. Clear browser LocalStorage (except `auth` if needed) → issues, properties, media, evidence remain after reload (from Supabase).
2. New device + same account → same data when auth/profile exists.
3. Vault and Issues show same linked evidence (both read hydrated cache).
4. `localStorage` keys for core data (`properties`, `issues`, `gallery`, etc.) are **not written**.

---

## D) Runbook

1. Apply `supabase/migrations/001_core_renter_schema.sql` in Supabase SQL editor.
2. Create Storage bucket `gallery` (public read or signed URLs per policy).
3. Set `.env.local` `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Sign in — `bootstrapMyHomeData()` hydrates from Supabase.
