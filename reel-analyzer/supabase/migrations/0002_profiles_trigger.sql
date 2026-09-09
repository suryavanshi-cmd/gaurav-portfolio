-- Every new auth user gets a profile row with five free credits.
--
-- security definer so the trigger can write to a table its caller (the anon
-- role, mid-signup) has no policy for; search_path is pinned because a
-- definer function inherits the caller's otherwise.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic credit spend. Returns the remaining balance, or null when the user had
-- none left — a plain `update ... set credits_remaining = credits_remaining - 1`
-- from two concurrent jobs could otherwise take the balance below zero.
create or replace function public.consume_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  update public.profiles
     set credits_remaining = credits_remaining - 1
   where id = p_user_id
     and credits_remaining > 0
  returning credits_remaining into remaining;

  return remaining;
end;
$$;

revoke all on function public.consume_credit(uuid) from public, anon, authenticated;
