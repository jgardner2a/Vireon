# Vireon

Next.js property dashboard: Supabase Auth, client-side data access, and a multi-module workspace per home.

## What this app is

- **Auth:** sign up, sign in, sign out (`lib/auth*`, `/login`).
- **Dashboard:** protected shell with sidebar (`/dashboard/*`), active home from `user_state.current_home_id`.
- **Data:** browser client uses the Supabase **anon** key + user JWT; **RLS and storage policies in Supabase** enforce tenancy (not app-server middleware).
- **Modules:** My Home (property + renter documents), Gallery, Maintenance, Notes, Communications; Vault nav is a placeholder.

### Domain boundaries: Gallery, Evidence logs, Documents

These are **three separate systems**. Do not merge tables, buckets, or UI flows.

#### Gallery (media catalog)

| | |
|--|--|
| **Purpose** | Browse/manage home photos in the `uploads` bucket; folders, bulk ops, link existing images to logs |
| **Route** | `/dashboard/gallery` |
| **Code** | `lib/gallery/*`, `app/dashboard/gallery/page.tsx` |
| **Tables** | `gallery`, `folders` |
| **Storage** | `uploads` (`STORAGE_BUCKET`) — paths `{userId}/{homeId}/…` |
| **Upload** | `uploadFilesToGallery({ context: "gallery" })` → `gallery` row, `owner_type` / `owner_id` **null** |
| **Delete** | `deleteGalleryItem()` only |
| **Not** | Renter lease/insurance docs; not a substitute for log text/records |

**Gallery-only upload ≠ evidence.** No `attachments` row until user links to a log (`markGalleryAsEvidence`) or uploads from a log module.

#### Evidence logs (Maintenance, Notes, Communications)

| | |
|--|--|
| **Purpose** | Narrative records (title, body, status, etc.) per home |
| **Routes** | `/dashboard/maintenance`, `/dashboard/notes`, `/dashboard/communications` |
| **Code** | `lib/maintenance/*`, `lib/notes/*`, `lib/communications/*`, `lib/attachments/*` |
| **Tables** | `maintenance_logs`, `notes`, `apartment_communications`, **`attachments`** (link table) |
| **Storage** | Same **`uploads`** bucket as Gallery — images must also have a **`gallery`** row |
| **Upload** | `uploadFilesToGallery({ context: "maintenance" \| "note" \| "communication", ownerId })` then insert **`attachments`**; **images only** (`lib/attachments/evidenceLogImageFiles.ts`) |
| **Delete log** | Delete log row → `cleanupAttachmentsAfterLogDelete` → **`deleteGalleryItem`** for linked `gallery` rows + attachment/storage cleanup |
| **Not** | PDFs on logs (rejected); not stored in `documents` bucket |

**Rule:** Upload from a log **must** create a Gallery row. `attachments` alone is not enough for new log images.

**`attachments`** = “this file is evidence for this log.” **`gallery.owner_type` / `owner_id`** = same link for catalog/filtering; keep in sync when linking.

#### Documents (renter paperwork — My Home only)

| | |
|--|--|
| **Purpose** | Private typed documents (lease, insurance, etc.) — **not** for Gallery browsing |
| **Route** | `/dashboard/my-home` (not Vault; Vault is a stub) |
| **Code** | `lib/documents/*` only |
| **Tables** | `documents` |
| **Storage** | **`documents`** bucket (`DOCUMENTS_BUCKET`) — paths `{homeId}/{type}/…` |
| **Upload** | `uploadHomeDocument()` — **never** `uploadFilesToGallery` |
| **View** | `storage_path` + sign on read (`createDocumentViewUrl`); do **not** persist URLs in DB |
| **Not** | `gallery`, `attachments`, or evidence `owner_type`; not shown on Gallery page |

### Cross-domain rules (quick reference)

| Action | Gallery | Evidence logs | Documents |
|--------|---------|---------------|-----------|
| New image in `uploads` for catalog | Yes | Via log upload | No |
| New file in `documents` bucket | No | No | Yes |
| `attachments` row | Only when linked to a log | Yes | Never |
| Delete log | — | Removes linked gallery rows | — |

Active home: read via `getActiveHomeId` / dashboard orchestrator (`reconcileDashboardHome`). User-selected home: write via `setCurrentHome` in `lib/myHome.ts`. Invalid `current_home_id` (not in `homes`): nulled in UI and cleared in `user_state` only via `reconcileDashboardHome` in `lib/dashboard/dashboardOrchestrator.ts`.

---

## Allowed (in scope by default)

- Auth and session (`supabase.auth.*`, `lib/authSession.ts`, `lib/useAuthSession.ts`).
- Dashboard UI and layout (`app/dashboard/*`, `app/components/*`).
- Client data layer in `lib/**` using `supabase.from(...)`, `supabase.storage`, and existing patterns.
- Bug fixes and features within the three domains above.
- `eslint`, `npm run dev` / `build` / `lint`.
- Reading `node_modules/next/dist/docs/` when changing Next.js code.

---

## Prohibited unless the user explicitly asks

- **Supabase migrations, seed SQL, or RLS/policy changes in this repo** — schema and policies live in the Supabase project, not in git here.
- **Service role key** or any secret in the frontend / committed env files.
- **New backend** (Route Handlers, Server Actions, or separate API) for data the client already accesses — unless the user requests that architecture.
- Crossing domain boundaries (see above): documents in Gallery, log files in `documents` bucket, log uploads that skip `gallery`, gallery uploads that auto-create `attachments`, evidence PDFs (**images only**).
- Large unrelated refactors, drive-by renames, or “simplify to auth-only” (that phase is over).
- Touching `_legacy/` except to delete when asked.

---

## Strict invariants (do not break)

These are enforced by code patterns; violations cause drift, orphans, or security gaps.

### Storage pipelines

| Bucket | Upload only via | Delete / lifecycle only via |
|--------|-----------------|-----------------------------|
| `uploads` | `uploadFilesToGallery()` | `deleteGalleryItem()` (+ log-delete cleanup that calls it) |
| `documents` | `uploadHomeDocument()` | `deleteDocumentRecordAndStorage()` in `lib/documents/documents.ts` |

- Do **not** call `supabase.storage.from("uploads").remove(...)` from new code except inside approved gallery/document helpers.
- Do **not** insert into `gallery` outside `uploadFilesToGallery` / copy-move helpers in `lib/gallery/`.

### Active home (`user_state`)

- **Read** `current_home_id` only through `getActiveHomeId()` / dashboard orchestrator (`getCachedCurrentHomeId` → `reconcileDashboardHome`).
- **Write (user picks a property):** only `setCurrentHome()` in `lib/myHome.ts`.
- **Write (clear stale pointer):** only `reconcileDashboardHome()` → `clearInvalidCurrentHomePointer()` in `lib/dashboard/dashboardOrchestrator.ts` (`current_home_id: null` when id ∉ `homes`). Do not clear pointers elsewhere.
- Dashboard feature pages: use `useDashboardState()` for `userId`, `currentHomeId`, `homes` — do not invent parallel home resolution.

### Data access layout

- New `supabase.from(...)` / storage calls belong in **`lib/<domain>/`**, not new logic buried in `app/dashboard/*/page.tsx` (pages are already large).
- Scope queries with `user_id` and `home_id` from dashboard state when the table has those columns (RLS is still required).

### Cache / UI consistency

- After mutations that change counts or lists, call existing invalidators (`invalidateDashboardSnapshot`, `invalidateStorageCache`, `invalidateDashboardHomesCache` as appropriate).
- Documents: never store signed URLs in Postgres; use `storage_path` + `createDocumentViewUrl()` on read.

### Identity

- Tenant user id for writes: session via `getCachedUserId()` / `auth.uid()` — never trust a user id from UI input alone.

---

## Conventions

- Prefer existing `lib/<module>/` layout; extend `lib/` before growing dashboard pages.
- Only create git commits or PRs when the user asks.
- No new test files unless the user asks.

---

## Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
