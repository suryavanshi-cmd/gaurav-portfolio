-- ============================================================================
-- Storage for listing photographs
--
-- Photos live in one public bucket, one folder per listing. Anyone may read —
-- a farm page is public — and only the owner of that listing may write into its
-- folder, which is what stops one host from replacing another host's rooms.
--
-- The whole file is guarded on the storage schema existing, so the same
-- migration can be applied to a plain PostgreSQL database (as the SQL check in
-- CI does) without failing.
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema not present — skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('listing-photos', 'listing-photos', true)
  on conflict (id) do nothing;

  drop policy if exists "listing photos are readable" on storage.objects;
  create policy "listing photos are readable" on storage.objects
    for select using (bucket_id = 'listing-photos');

  drop policy if exists "hosts write their own listing folder" on storage.objects;
  create policy "hosts write their own listing folder" on storage.objects
    for insert to authenticated with check (
      bucket_id = 'listing-photos'
      and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and public.owns_listing(((storage.foldername(name))[1])::uuid)
    );

  drop policy if exists "hosts delete their own listing folder" on storage.objects;
  create policy "hosts delete their own listing folder" on storage.objects
    for delete to authenticated using (
      bucket_id = 'listing-photos'
      and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and public.owns_listing(((storage.foldername(name))[1])::uuid)
    );
end $$;
