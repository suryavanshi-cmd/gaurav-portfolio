-- ============================================================================
-- The name on a review
--
-- Reviews are public; bookings are not, and deliberately so — a booking row
-- carries a phone number. Reading the reviewer's name through the booking
-- therefore fails for exactly the visitor the review is written for.
--
-- So the display name is copied onto the review, by a trigger rather than by
-- the application: the row it is copied from is still the booking the reviewer
-- proved they owned, and no client can put a different name there.
-- ============================================================================

alter table public.reviews add column if not exists guest_name text;

create or replace function public.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select b.guest_name into new.guest_name
  from public.bookings b
  where b.id = new.booking_id;
  return new;
end;
$$;

drop trigger if exists set_review_author on public.reviews;
create trigger set_review_author before insert on public.reviews
  for each row execute function public.set_review_author();

-- Reviews written before this migration.
update public.reviews r
set guest_name = b.guest_name
from public.bookings b
where b.id = r.booking_id and r.guest_name is null;
