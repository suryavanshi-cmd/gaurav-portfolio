-- Atomic claim for the local transcription worker.
--
-- The claim endpoint used to `select ... where status = 'transcribing' limit 1`
-- with nothing to stop the same row coming back on the next poll. One worker
-- got handed the same job repeatedly (its second submit 409s); two workers
-- would both download and transcribe the same video.
--
-- A lease fixes it: claiming stamps claimed_at, and a claim only considers jobs
-- that are unclaimed or whose lease has expired — so a worker that crashes
-- mid-job releases it instead of stranding it forever.

alter table jobs add column if not exists claimed_at timestamptz;

create or replace function public.claim_transcription_job(p_lease_seconds int default 900)
returns table (job_id uuid, reel_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update jobs
     set claimed_at = now()
   where jobs.id = (
     select j.id
       from jobs j
      where j.status = 'transcribing'
        and (j.claimed_at is null or j.claimed_at < now() - make_interval(secs => p_lease_seconds))
      order by j.started_at nulls first
      limit 1
      -- Two workers polling at once take different rows rather than blocking.
      for update skip locked
   )
  returning jobs.id, jobs.reel_id;
end;
$$;

revoke all on function public.claim_transcription_job(int) from public, anon, authenticated;
