-- ═══════════════════════════════════════════════════════════════════════════
--  रक्त-सेतू · 0004 — per-user hold recovery
-- ═══════════════════════════════════════════════════════════════════════════
--
--  fn_expire_stale_holds() sweeps the whole table and is called on server
--  boot. That is fine for a long-running process on a lab PC, but a
--  serverless deployment never boots: a function that dies mid-extraction —
--  a timeout, a cold-start kill, an unhandled crash — leaves its reservation
--  behind, and nothing ever sweeps it. The user's tokens stay reserved
--  forever and they cannot spend money they have already paid.
--
--  This narrows the sweep to one user so it can run inline, on the exact code
--  path that notices the problem: a reservation that failed while the account
--  still shows reserved tokens.

create or replace function public.fn_expire_user_holds(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold  record;
  v_count integer := 0;
begin
  for v_hold in
    select * from credit_holds
     where user_id = p_user_id
       and status = 'held'
       and expires_at < now()
     order by created_at
     for update skip locked
  loop
    update credits
       set reserved_tokens = greatest(0, credits.reserved_tokens - v_hold.tokens),
           updated_at      = now()
     where user_id = v_hold.user_id;

    update credit_holds
       set status = 'expired', settled_at = now()
     where id = v_hold.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

do $$
begin
  execute 'revoke all on function public.fn_expire_user_holds(uuid) from public, anon, authenticated';
  execute 'grant execute on function public.fn_expire_user_holds(uuid) to service_role';
end;
$$;
