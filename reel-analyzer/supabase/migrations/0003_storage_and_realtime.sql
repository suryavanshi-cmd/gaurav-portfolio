-- Videos live in a private bucket. Nothing is served from it directly; the app
-- hands out short-lived signed URLs, and the transcription provider gets one
-- too rather than a permanent public link.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reel-videos',
  'reel-videos',
  false,
  209715200, -- 200 MB; a 90-second reel is comfortably inside this
  array['video/mp4','video/quicktime','video/webm','video/x-m4v']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are namespaced by user id: reel-videos/<uid>/<reel-id>.mp4. The first
-- path segment is therefore the owner, which is what these policies check.
drop policy if exists "own videos read" on storage.objects;
create policy "own videos read" on storage.objects for select
  using (bucket_id = 'reel-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own videos write" on storage.objects;
create policy "own videos write" on storage.objects for insert
  with check (bucket_id = 'reel-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own videos delete" on storage.objects;
create policy "own videos delete" on storage.objects for delete
  using (bucket_id = 'reel-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- The status page watches this one table over Realtime instead of polling.
-- RLS still applies to the stream, so a subscriber only ever sees their own job.
do $$ begin
  alter publication supabase_realtime add table jobs;
exception
  when duplicate_object then null;
end $$;
