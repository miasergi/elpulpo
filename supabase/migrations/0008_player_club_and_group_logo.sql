-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Player club + custom group logo                                   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Club a player currently plays at (backfilled from TheSportsDB by name).
alter table public.players add column if not exists club text;

-- Custom group logo image (overrides the icon when set).
alter table public.groups add column if not exists logo_url text;

-- ─────────────────────────────────────────────────────────────────────
-- Storage policies for the public `group-logos` bucket.
-- Public read; authenticated users may upload/replace (attaching the logo
-- to a group is separately gated by groups_update_admin RLS).
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists "group_logos_read" on storage.objects;
create policy "group_logos_read" on storage.objects for select
  using (bucket_id = 'group-logos');

drop policy if exists "group_logos_write" on storage.objects;
create policy "group_logos_write" on storage.objects for insert
  with check (bucket_id = 'group-logos' and auth.role() = 'authenticated');

drop policy if exists "group_logos_update" on storage.objects;
create policy "group_logos_update" on storage.objects for update
  using (bucket_id = 'group-logos' and auth.role() = 'authenticated');
