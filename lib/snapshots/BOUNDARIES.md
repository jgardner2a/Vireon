# Snapshot media boundaries

**Gallery = database layer for media** (`uploads` bucket + `gallery` table).

**Snapshots = creation layer** for move-in / move-out media.

## Allowed in `lib/snapshots/`

- `uploadSnapshotImage()` — storage upload → `gallery` insert → `snapshot_images` link
- `addSnapshotImages()` — link existing `gallery.id` rows (API only; snapshot UI is upload-only)
- Read helpers: `getSnapshot`, `getSnapshots`, etc.
- Shared infra: `@/lib/storagePath`, `@/lib/storageCache`, `@/lib/supabaseClient`, image MIME checks in `@/lib/attachments/evidenceLogImageFiles`

## Forbidden in `lib/snapshots/`

- `uploadFilesToGallery` / `@/lib/gallery/uploadStorageFiles`
- Gallery page imports (`@/app/dashboard/gallery/**`)
- Separate snapshot storage buckets or tables duplicating `gallery`
- Maintenance / `attachments` / evidence `owner_type` for snapshot media

## Snapshot page UI (`app/dashboard/snapshots/`)

- Upload controls call **`uploadSnapshotImage` only**
- May **read** `gallery` rows by id to resolve signed URLs for display — not link-from-gallery UI

ESLint enforces the import rules on `lib/snapshots/**` and `app/dashboard/snapshots/**`.

## Supabase tables (managed in project, not in this repo)

The client expects these tables with API access enabled:

- **`snapshots`**: `id`, `home_id`, `type` (`move_in` | `move_out`), `created_at` (tenancy via `home_id` + RLS on `homes`, like `documents`)
- **`snapshot_images`**: `id`, `snapshot_id`, `gallery_id`, `room`, `order_index` (optional int), `created_at`
- **`snapshot_issues`**: `id`, `snapshot_id`, `label`, `room`, `notes`, `severity`, `created_at`

If the API returns `PGRST205` / “schema cache”, the table is missing or API access for that table is off.
