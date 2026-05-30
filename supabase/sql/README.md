# Supabase SQL scripts

Schema changes are applied in the **Supabase Dashboard → SQL Editor**, not via git migrations in CI.

## Order

1. Run `001_profiles_and_subscriptions.sql` once on your project.
2. Run `002_profile_export_entitlements.sql` to add export credit columns.
3. Run `003_documents_file_size.sql` so Pro storage can include the documents bucket.
4. Run `004_profiles_api_grants.sql` if the app cannot read `profiles` (permission errors).
5. Confirm in **Table Editor**: `profiles` and `subscriptions` exist with expected columns.
6. Confirm **Authentication → Users**: new sign-ups get a `profiles` row with `plan = free`.

## After running

- Existing users receive `profiles.plan = 'free'` via backfill at the end of the script.
- `subscriptions` stays empty until Stripe (or manual Pro grants via service role).
- To manually grant Pro for testing (SQL Editor, service role context):

```sql
update public.profiles set plan = 'pro' where id = 'USER-UUID-HERE';
```

Revert to Free:

```sql
update public.profiles set plan = 'free' where id = 'USER-UUID-HERE';
delete from public.subscriptions where user_id = 'USER-UUID-HERE';
```

Grant a one-time export credit for testing:

```sql
update public.profiles
set export_credits = export_credits + 1
where id = 'USER-UUID-HERE';
```

Reset Pro included export (after a test export):

```sql
update public.profiles
set pro_included_export_used = false
where id = 'USER-UUID-HERE';
```
